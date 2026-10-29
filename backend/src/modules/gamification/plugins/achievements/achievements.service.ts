import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ExpLedgerService } from '../../core/exp-ledger.service';
import { OnEvent } from '@nestjs/event-emitter';
import { TagType } from '@prisma/client';

export interface AchievementDefinition {
  code: string;
  name: string;
  colorCode: string;
  expReward: number;
  description: string;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    code: 'ACH_ATTENDANCE_STREAK',
    name: 'Chiến Binh Chuyên Cần',
    colorCode: '#2e7d32',
    expReward: 50,
    description: 'Tham gia 5 ca trực đúng giờ liên tiếp tại xưởng P407.',
  },
  {
    code: 'ACH_CODE_WARRIOR',
    name: 'Thợ Code Xuyên Màn Đêm',
    colorCode: '#0052cc',
    expReward: 50,
    description: 'Đóng góp 10 commits hợp lệ lên các dự án thực chiến.',
  },
  {
    code: 'ACH_BUG_HUNTER',
    name: 'Thợ Săn Lỗi Tinh Nhuệ',
    colorCode: '#e65100',
    expReward: 50,
    description: 'Báo cáo 5 lỗi hợp lệ được Dev và Lead nghiệm thu.',
  },
  {
    code: 'ACH_QA_GATEKEEPER',
    name: 'Người Gác Cổng QA',
    colorCode: '#6a1b9a',
    expReward: 50,
    description: 'Xác minh và đóng 5 lỗi theo đúng Quy tắc 4 mắt.',
  },
];

@Injectable()
export class AchievementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expLedger: ExpLedgerService,
  ) {}

  /**
   * T083: Mở khóa Thành tựu tự động và trao huy hiệu +50 EXP
   */
  async unlockAchievement(userId: string, achievementCode: string) {
    const achDef = ACHIEVEMENTS_CATALOG.find((a) => a.code === achievementCode);
    if (!achDef) return null;

    // 1. Tạo hoặc lấy BadgeTag
    const tag = await this.prisma.badgeTag.upsert({
      where: { name: achDef.name },
      create: {
        name: achDef.name,
        tagType: TagType.ACHIEVEMENT,
        colorCode: achDef.colorCode,
        isCurse: false,
      },
      update: {},
    });

    // 2. Kiểm tra nếu user đã có tag này chưa
    const existing = await this.prisma.userTag.findUnique({
      where: {
        userId_tagId: { userId, tagId: tag.id },
      },
    });

    if (existing) {
      return { alreadyUnlocked: true, tag };
    }

    // 3. Gắn UserTag và cộng thưởng EXP
    const userTag = await this.prisma.userTag.create({
      data: {
        userId,
        tagId: tag.id,
        isDisplayed: true,
        isLocked: false,
      },
    });

    await this.expLedger.recordTransaction(
      userId,
      achDef.expReward,
      'ACHIEVEMENT_UNLOCKED',
      `Mở khóa Thành tựu: ${achDef.name}`,
      tag.id,
    );

    return {
      unlocked: true,
      tag,
      userTag,
      expAwarded: achDef.expReward,
    };
  }

  // Event Listeners cho tự động mở khóa
  @OnEvent('attendance.streak.5')
  async handleAttendanceStreak(payload: { userId: string }) {
    return this.unlockAchievement(payload.userId, 'ACH_ATTENDANCE_STREAK');
  }

  @OnEvent('github.commits.milestone')
  async handleCommitsMilestone(payload: { userId: string; commitCount: number }) {
    if (payload.commitCount >= 10) {
      return this.unlockAchievement(payload.userId, 'ACH_CODE_WARRIOR');
    }
  }

  @OnEvent('bug.hunter.milestone')
  async handleBugHunterMilestone(payload: { userId: string; bugCount: number }) {
    if (payload.bugCount >= 5) {
      return this.unlockAchievement(payload.userId, 'ACH_BUG_HUNTER');
    }
  }

  @OnEvent('qa.gatekeeper.milestone')
  async handleQaGatekeeperMilestone(payload: { userId: string; verifiedCount: number }) {
    if (payload.verifiedCount >= 5) {
      return this.unlockAchievement(payload.userId, 'ACH_QA_GATEKEEPER');
    }
  }
}
