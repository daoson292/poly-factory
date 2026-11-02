import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ExpLedgerService } from '../gamification/core/exp-ledger.service';
import * as crypto from 'crypto';
import { ProjectActivityType } from '@prisma/client';

@Injectable()
export class GitHubWebhookService {
  private readonly logger = new Logger('GitHubWebhookService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly expLedger: ExpLedgerService,
  ) {}

  /**
   * T045: Xác thực chữ ký HMAC-SHA256 (FR-polyfactory-155, E-polyfactory-153)
   */
  verifySignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    const secret = this.configService.get<string>(
      'GITHUB_WEBHOOK_SECRET',
      'super_secret_github_webhook_polyfactory_2026',
    );

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-153',
        message: 'Chữ ký GitHub Webhook không hợp lệ hoặc thiếu header X-Hub-Signature-256.',
      });
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signatureHeader, 'utf8');

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-153',
        message: 'Chữ ký GitHub Webhook không khớp với GITHUB_WEBHOOK_SECRET.',
      });
    }

    return true;
  }

  /**
   * T045: Xử lý sự kiện Webhook (Push commit / PR merged / Repository archived)
   * - Chống trùng qua WebhookDelivery
   * - Thưởng +5 EXP / commit, +15 EXP / PR merged
   */
  async processWebhook(deliveryId: string, eventType: string, payload: any) {
    // 1. Chống trùng lặp Webhook
    const existing = await this.prisma.webhookDelivery.findUnique({
      where: { deliveryId },
    });
    if (existing) {
      this.logger.warn(`[GITHUB WEBHOOK] Duplicate deliveryId ignored: ${deliveryId}`);
      return { duplicate: true };
    }

    await this.prisma.webhookDelivery.create({
      data: { deliveryId, eventType },
    });

    // 2. Tìm Project tương ứng qua repository URL hoặc ID
    const repoUrl = payload.repository?.html_url;
    if (!repoUrl) return { skipped: true, reason: 'NO_REPOSITORY' };

    const project = await this.prisma.project.findFirst({
      where: {
        OR: [
          { githubRepoUrl: repoUrl },
          { githubRepoUrl: `${repoUrl}.git` },
        ],
      },
    });

    if (!project) {
      return { skipped: true, reason: 'PROJECT_NOT_FOUND' };
    }

    // 3. Xử lý repository.archived
    if (payload.repository?.archived && !project.githubArchivedAt) {
      await this.prisma.project.update({
        where: { id: project.id },
        data: { githubArchivedAt: new Date() },
      });
    }

    // 4. Xử lý PUSH commits
    if (eventType === 'push') {
      const ref = payload.ref || '';
      const validBranches = ['refs/heads/main', 'refs/heads/master', 'refs/heads/develop'];
      if (!validBranches.includes(ref)) {
        return { skipped: true, reason: 'BRANCH_IGNORED' };
      }

      const branchName = ref.replace('refs/heads/', '');
      const commits = payload.commits || [];

      for (const commit of commits) {
        const ghUsername = commit.author?.username || commit.committer?.username;
        let matchedUser = null;

        if (ghUsername) {
          matchedUser = await this.prisma.user.findUnique({
            where: { githubUsername: ghUsername },
          });
        }

        // Lưu bản ghi ProjectActivity (chống trùng commitHash)
        const existingActivity = await this.prisma.projectActivity.findUnique({
          where: { commitHash: commit.id },
        });

        if (!existingActivity) {
          await this.prisma.projectActivity.create({
            data: {
              projectId: project.id,
              userId: matchedUser?.id || null,
              activityType: ProjectActivityType.COMMIT,
              commitHash: commit.id,
              commitMessage: commit.message || '',
              branchName,
            },
          });

          // Cộng +5 EXP cho thành viên
          if (matchedUser) {
            await this.expLedger.recordTransaction(
              matchedUser.id,
              5,
              'GITHUB_COMMIT',
              `Commit GitHub: ${commit.message?.substring(0, 50) || commit.id}`,
              commit.id,
            );
          }
        }
      }

      return { success: true, processedCommits: commits.length };
    }

    // 5. Xử lý PULL REQUEST merged
    if (eventType === 'pull_request') {
      const isMerged = payload.action === 'closed' && payload.pull_request?.merged === true;
      if (!isMerged) {
        return { skipped: true, reason: 'PR_NOT_MERGED' };
      }

      const prNumber = payload.pull_request.number;
      const ghUsername = payload.pull_request.user?.login;
      let matchedUser = null;

      if (ghUsername) {
        matchedUser = await this.prisma.user.findUnique({
          where: { githubUsername: ghUsername },
        });
      }

      const commitHash = payload.pull_request.merge_commit_sha || `pr_${prNumber}_${Date.now()}`;

      await this.prisma.projectActivity.create({
        data: {
          projectId: project.id,
          userId: matchedUser?.id || null,
          activityType: ProjectActivityType.PR_MERGED,
          commitHash,
          prNumber,
          commitMessage: payload.pull_request.title || `Merged PR #${prNumber}`,
          branchName: payload.pull_request.base?.ref || 'main',
        },
      });

      // Cộng +15 EXP khi PR được merge
      if (matchedUser) {
        await this.expLedger.recordTransaction(
          matchedUser.id,
          15,
          'GITHUB_PR_MERGED',
          `Merged PR #${prNumber}: ${payload.pull_request.title || ''}`,
          commitHash,
        );
      }

      return { success: true, mergedPr: prNumber };
    }

    return { skipped: true, eventType };
  }

  /**
   * T046: Ghép hồi tố commit lịch sử khi thành viên cập nhật githubUsername
   */
  async linkHistoricalCommits(userId: string, githubUsername: string) {
    const unlinkedActivities = await this.prisma.projectActivity.findMany({
      where: {
        userId: null,
      },
    });

    let linkedCount = 0;
    for (const act of unlinkedActivities) {
      await this.prisma.projectActivity.update({
        where: { id: act.id },
        data: { userId },
      });
      linkedCount++;
    }

    return { success: true, linkedCount };
  }

  /**
   * T046: Cảnh báo dự án 3 ngày không có hoạt động
   */
  async checkInactiveProjects(now: Date = new Date()) {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600_000);

    const activeProjects = await this.prisma.project.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const inactiveProjects = activeProjects.filter((p) => {
      const lastActivity = p.activities[0]?.createdAt || p.createdAt;
      return lastActivity < threeDaysAgo;
    });

    return inactiveProjects.map((p) => ({
      projectId: p.id,
      name: p.name,
      lastActivityAt: p.activities[0]?.createdAt || p.createdAt,
    }));
  }
}
