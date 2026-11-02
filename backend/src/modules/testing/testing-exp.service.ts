import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExpLedgerService } from '../gamification/core/exp-ledger.service';

@Injectable()
export class TestingExpService {
  public static readonly MONTHLY_PROJECT_CAP = 100; // Trần 100 EXP / người / dự án / tháng (Mục 6.11.A)

  constructor(
    private readonly prisma: PrismaService,
    private readonly expLedger: ExpLedgerService,
  ) {}

  /**
   * T053: Cộng thưởng EXP kiểm thử có kiểm soát trần 100 EXP/tháng/dự án
   */
  async awardTestingExp(
    userId: string,
    projectId: string,
    amount: number,
    source: string,
    reason: string,
    refId?: string,
  ) {
    if (amount <= 0) return { awarded: 0, capped: false };

    // Tính tổng EXP kiểm thử đã nhận trong tháng này của dự án
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const monthTxs = await this.prisma.expTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: firstDayOfMonth },
        source: {
          in: ['TEST_RUN_COMPLETED', 'BUG_VALID_REPORTED', 'BUG_FIXED_VERIFIED'],
        },
        reason: { contains: projectId }, // gắn projectId vào reason để tra cứu theo dự án
      },
    });

    const currentMonthEarned = monthTxs.reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);

    if (currentMonthEarned >= TestingExpService.MONTHLY_PROJECT_CAP) {
      return { awarded: 0, capped: true, currentMonthEarned };
    }

    const availableQuota = TestingExpService.MONTHLY_PROJECT_CAP - currentMonthEarned;
    const actualAmount = Math.min(amount, availableQuota);

    const fullReason = `[Project: ${projectId}] ${reason}`;
    await this.expLedger.recordTransaction(userId, actualAmount, source, fullReason, refId);

    return {
      awarded: actualAmount,
      capped: actualAmount < amount,
      currentMonthEarned: currentMonthEarned + actualAmount,
    };
  }

  /**
   * T053: Thu hồi tạm thời -5 EXP của Dev khi Bug bị REOPENED
   */
  async revokeDevExp(
    devId: string,
    projectId: string,
    amount: number = 5,
    reason: string,
    refId?: string,
  ) {
    const fullReason = `[Project: ${projectId}] ${reason}`;
    return this.expLedger.recordTransaction(
      devId,
      -amount,
      'BUG_REOPENED_REVOKE_DEV',
      fullReason,
      refId,
    );
  }
}
