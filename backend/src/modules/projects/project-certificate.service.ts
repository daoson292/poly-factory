import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Position } from '@prisma/client';

@Injectable()
export class ProjectCertificateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T056: Đánh giá điều kiện và cấp Chứng chỉ Dự án Đa Công pháp (PF-CERT-YYYY-XXXX)
   */
  async evaluateAndIssueCertificate(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
      include: { project: true, user: true },
    });

    if (!member) {
      throw new NotFoundException('Thành viên không thuộc dự án này.');
    }

    const project = member.project;
    const year = new Date().getFullYear();

    // 1. Kiểm tra điều kiện theo từng Công pháp (Mục 6.11.B)
    let isEligible = false;
    let contributionSummary = '';

    if (
      member.position === Position.FRONTEND ||
      member.position === Position.BACKEND ||
      member.position === Position.FULLSTACK
    ) {
      // Đếm commit & PR
      const commitsCount = await this.prisma.projectActivity.count({
        where: { projectId, userId, activityType: 'COMMIT' },
      });
      const prCount = await this.prisma.projectActivity.count({
        where: { projectId, userId, activityType: 'PR_MERGED' },
      });
      const bugsFixedCount = await this.prisma.bug.count({
        where: { projectId, fixedById: userId, status: 'CLOSED' },
      });

      if (commitsCount >= 5 || prCount >= 2 || bugsFixedCount >= 3) {
        isEligible = true;
        contributionSummary = `${member.position}: ${commitsCount} commits, ${prCount} PRs, ${bugsFixedCount} bugs fixed.`;
      }
    } else if (member.position === Position.TESTER) {
      // Đếm test cases executed & valid bugs reported
      const executedCount = await this.prisma.testResult.count({
        where: { testRun: { projectId }, executedById: userId, status: { not: 'UNTESTED' } },
      });
      const bugsFoundCount = await this.prisma.bug.count({
        where: { projectId, reporterId: userId, status: { in: ['RESOLVED', 'CLOSED'] } },
      });

      if (executedCount >= 10 || bugsFoundCount >= 2) {
        isEligible = true;
        contributionSummary = `TESTER: ${executedCount} test cases executed, ${bugsFoundCount} verified bugs found.`;
      }
    } else if (member.position === Position.UI_UX || member.position === Position.BA) {
      // Nghiệm thu deliverable
      if (member.isDeliverableVerified) {
        isEligible = true;
        contributionSummary = `${member.position}: Deliverable artifacts verified by Lead/Mentor.`;
      }
    }

    if (!isEligible) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-154',
        message: 'Thành viên chưa đạt đủ điều kiện đóng góp để nhận Chứng chỉ Dự án.',
      });
    }

    // 2. Sinh mã chứng chỉ PF-CERT-YYYY-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const certificateCode = `PF-CERT-${year}-${randomSuffix}`;

    return this.prisma.projectCertificate.upsert({
      where: {
        projectId_userId: { projectId, userId },
      },
      create: {
        projectId,
        userId,
        position: member.position,
        certificateCode,
        contributionSummary,
      },
      update: {
        contributionSummary,
      },
    });
  }
}
