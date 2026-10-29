import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LevelEngineService } from './level-engine.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ExpLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly levelEngine: LevelEngineService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * T031: Ghi sổ cái bất biến & cập nhật User (FR-polyfactory-170 -> 175)
   * - Đảm bảo currentExp >= 0 (không âm số dư khả dụng)
   * - Cập nhật totalExpEarned và currentLevel bậc thang
   * - Bảo toàn cấp cao nhất (không tụt Level khi bị phạt EXP)
   * - Phát sự kiện gamification.level_up khi lên cấp
   */
  async recordTransaction(
    userId: string,
    amount: number,
    source: string,
    reason: string,
    refId?: string,
  ) {
    if (refId && typeof this.prisma.expTransaction?.findFirst === 'function') {
      const existing = await this.prisma.expTransaction.findFirst({
        where: {
          userId,
          source,
          referenceId: refId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    let actualAmount = amount;

    // Không âm số dư khả dụng
    if (amount < 0) {
      if (user.currentExp <= 0) {
        actualAmount = 0;
      } else if (user.currentExp + amount < 0) {
        actualAmount = -user.currentExp;
      }
    }

    const newBalance = user.currentExp + actualAmount;
    const newTotalExp =
      actualAmount > 0 ? user.totalExpEarned + actualAmount : user.totalExpEarned;

    // Tính level mới và bảo toàn level cao nhất
    const calculatedLevel = this.levelEngine.calculateLevel(newTotalExp);
    const oldLevel = user.currentLevel || 1;
    const newLevel = Math.max(oldLevel, calculatedLevel);

    // Ghi sổ cái bất biến
    const tx = await this.prisma.expTransaction.create({
      data: {
        userId,
        amount: actualAmount,
        balanceAfter: newBalance,
        source,
        reason,
        referenceId: refId,
      },
    });

    // Cập nhật User
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentExp: newBalance,
        totalExpEarned: newTotalExp,
        currentLevel: newLevel,
      },
    });

    // Phát sự kiện lên cấp nếu có
    if (newLevel > oldLevel && this.eventEmitter) {
      this.eventEmitter.emit('gamification.level_up', {
        userId,
        oldLevel,
        newLevel,
        totalExpEarned: newTotalExp,
      });
    }

    return tx;
  }
}
