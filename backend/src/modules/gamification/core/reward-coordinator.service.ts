import { Injectable } from '@nestjs/common';
import { ExpLedgerService } from './exp-ledger.service';
import { CurseEngineService } from './curse-engine.service';
import { PrismaService } from '../../../database/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class RewardCoordinatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expLedger: ExpLedgerService,
    private readonly curseEngine: CurseEngineService,
  ) {}

  /**
   * Lắng nghe sự kiện có mặt hợp lệ từ module Điểm danh
   */
  @OnEvent('attendance.present')
  async handleAttendancePresent(event: {
    userId: string;
    expEarned?: number;
    penalty?: number;
    isWalkIn?: boolean;
    cosmeticRewardId?: string;
  }) {
    if (event.expEarned && event.expEarned > 0) {
      await this.expLedger.recordTransaction(
        event.userId,
        event.expEarned,
        'ATTENDANCE_NORMAL',
        'Điểm danh ca trực thành công',
      );
    }

    if (event.penalty && event.penalty > 0) {
      await this.expLedger.recordTransaction(
        event.userId,
        -event.penalty,
        'ATTENDANCE_LATE_PENALTY',
        'Phạt đi trễ quá 15 phút',
      );
    }

    // Nếu ca trực chính thức (không phải walk-in), tính vào chuỗi giải trừ phong ấn
    if (!event.isWalkIn) {
      await this.curseEngine.handleValidPresence(event.userId);
    }
  }

  /**
   * Lắng nghe sự kiện vắng không phép từ module Điểm danh
   */
  @OnEvent('attendance.unexcused')
  async handleAttendanceUnexcused(event: { userId: string }) {
    await this.curseEngine.handleUnexcusedAbsence(event.userId);
  }

  /**
   * T033: Bảng xếp hạng thành viên theo EXP (FR-polyfactory-170)
   */
  async getLeaderboard(period: 'all' | 'month' = 'all', limit = 20) {
    const users = await this.prisma.user.findMany({
      where: {
        status: { in: ['ACTIVE', 'ALUMNI'] },
      },
      orderBy: { totalExpEarned: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        currentExp: true,
        totalExpEarned: true,
        currentLevel: true,
        role: true,
        isCursed: true,
      },
    });

    return users.map((u, idx) => ({
      rank: idx + 1,
      ...u,
    }));
  }

  /**
   * T085: Bảng xếp hạng Top Chuyên Cần tháng
   */
  async getAttendanceLeaderboard(limit = 10) {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        consecutivePresentCount: true,
      },
      orderBy: { consecutivePresentCount: 'desc' },
    });

    return users.map((u, idx) => ({
      rank: idx + 1,
      ...u,
    }));
  }

  /**
   * T085: Bảng xếp hạng Top Commit / GitHub hoạt động tháng
   */
  async getGitHubLeaderboard(limit = 10) {
    const txs = await this.prisma.expTransaction.groupBy({
      by: ['userId'],
      where: {
        source: { in: ['GITHUB_COMMIT', 'GITHUB_PR_MERGED'] },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const userIds = txs.map((t) => t.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true, githubUsername: true },
    });

    return txs.map((t, idx) => {
      const u = users.find((x) => x.id === t.userId);
      return {
        rank: idx + 1,
        userId: t.userId,
        fullName: u?.fullName || 'Thành viên',
        githubUsername: u?.githubUsername,
        expEarned: t._sum.amount || 0,
      };
    });
  }

  /**
   * T085: Bảng xếp hạng Top Tester & Thợ săn Bug tháng
   */
  async getTestingLeaderboard(limit = 10) {
    const txs = await this.prisma.expTransaction.groupBy({
      by: ['userId'],
      where: {
        source: { in: ['TEST_RUN_COMPLETED', 'BUG_VALID_REPORTED', 'BUG_FIXED_VERIFIED'] },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const userIds = txs.map((t) => t.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true },
    });

    return txs.map((t, idx) => {
      const u = users.find((x) => x.id === t.userId);
      return {
        rank: idx + 1,
        userId: t.userId,
        fullName: u?.fullName || 'Tester',
        expEarned: t._sum.amount || 0,
      };
    });
  }

  /**
   * T033: Mentor trao gói thưởng EXP hoặc vật phẩm
   */
  async grantRewardPackage(
    userId: string,
    expAmount: number,
    cosmeticIds?: string[],
    reason: string = 'Khen thưởng',
  ) {
    if (expAmount > 0) {
      await this.expLedger.recordTransaction(userId, expAmount, 'REWARD_PACKAGE', reason);
    }

    if (cosmeticIds && cosmeticIds.length > 0) {
      for (const cosmeticId of cosmeticIds) {
        await this.prisma.userCosmetic.upsert({
          where: {
            userId_cosmeticId: { userId, cosmeticId },
          },
          create: { userId, cosmeticId },
          update: {},
        });
      }
    }

    return { success: true, grantedExp: expAmount, grantedCosmetics: cosmeticIds?.length ?? 0 };
  }

  /**
   * T033: Mentor xóa tội phong ấn
   */
  async pardonCurse(mentorId: string, userId: string) {
    return this.curseEngine.pardonCurse(mentorId, userId);
  }
}
