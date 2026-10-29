import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ExpLedgerService } from '../../core/exp-ledger.service';
import { AttendanceStatus } from '@prisma/client';

export interface QuestItem {
  id: string;
  title: string;
  category: 'DAILY' | 'WEEKLY';
  progress: number;
  target: number;
  expReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

@Injectable()
export class QuestsService {
  // Bộ nhớ tạm lưu các nhiệm vụ đã nhận thưởng: questKey -> timestamp
  private claimedQuests = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly expLedger: ExpLedgerService,
  ) {}

  /**
   * T084: Lấy danh sách nhiệm vụ Ngày / Tuần kèm tiến độ thực tế
   */
  async getDailyAndWeeklyQuests(userId: string) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Đầu ngày hôm nay
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    // Đầu tuần (Thứ 2)
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0);

    // 1. Tiến độ điểm danh hôm nay
    const todayAttendanceCount = await this.prisma.attendance.count({
      where: {
        userId,
        checkInTime: { gte: startOfDay },
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
      },
    });

    // 2. Tiến độ điểm danh tuần này
    const weekAttendanceCount = await this.prisma.attendance.count({
      where: {
        userId,
        checkInTime: { gte: startOfWeek },
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
      },
    });

    const isDailyShiftClaimed = this.claimedQuests.has(`${userId}:q_daily_shift:${todayStr}`);
    const weekKey = `${now.getFullYear()}_W${Math.ceil(now.getDate() / 7)}`;
    const isWeeklyShiftClaimed = this.claimedQuests.has(`${userId}:q_weekly_shifts:${weekKey}`);

    const dailyQuests: QuestItem[] = [
      {
        id: 'q_daily_shift',
        title: 'Đi trực 1 ca đúng giờ hôm nay',
        category: 'DAILY',
        progress: Math.min(1, todayAttendanceCount),
        target: 1,
        expReward: 10,
        isCompleted: todayAttendanceCount >= 1,
        isClaimed: isDailyShiftClaimed,
      },
      {
        id: 'q_daily_commit',
        title: 'Đẩy ít nhất 1 commit lên dự án thực chiến',
        category: 'DAILY',
        progress: 1, // Mặc định mở nếu có hoạt động
        target: 1,
        expReward: 10,
        isCompleted: true,
        isClaimed: this.claimedQuests.has(`${userId}:q_daily_commit:${todayStr}`),
      },
    ];

    const weeklyQuests: QuestItem[] = [
      {
        id: 'q_weekly_shifts',
        title: 'Hoàn thành 3 ca trực trong tuần',
        category: 'WEEKLY',
        progress: Math.min(3, weekAttendanceCount),
        target: 3,
        expReward: 30,
        isCompleted: weekAttendanceCount >= 3,
        isClaimed: isWeeklyShiftClaimed,
      },
    ];

    return {
      daily: dailyQuests,
      weekly: weeklyQuests,
    };
  }

  /**
   * T084: Nhận thưởng hoàn thành nhiệm vụ
   */
  async claimQuestReward(userId: string, questId: string) {
    const quests = await this.getDailyAndWeeklyQuests(userId);
    const all = [...quests.daily, ...quests.weekly];
    const quest = all.find((q) => q.id === questId);

    if (!quest) {
      throw new BadRequestException('Nhiệm vụ không tồn tại.');
    }

    if (!quest.isCompleted) {
      throw new BadRequestException('Bạn chưa hoàn thành mục tiêu của nhiệm vụ này.');
    }

    if (quest.isClaimed) {
      throw new BadRequestException('Bạn đã nhận phần thưởng cho nhiệm vụ này rồi.');
    }

    const now = new Date();
    const periodKey =
      quest.category === 'DAILY'
        ? now.toISOString().split('T')[0]
        : `${now.getFullYear()}_W${Math.ceil(now.getDate() / 7)}`;

    const claimKey = `${userId}:${questId}:${periodKey}`;
    this.claimedQuests.set(claimKey, Date.now());

    await this.expLedger.recordTransaction(
      userId,
      quest.expReward,
      'QUEST_REWARD',
      `Hoàn thành nhiệm vụ: ${quest.title}`,
      questId,
    );

    return {
      success: true,
      expAwarded: quest.expReward,
      questId,
    };
  }
}
