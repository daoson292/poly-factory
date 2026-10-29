import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ExpLedgerService } from './exp-ledger.service';
import { TagType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const CURSE_TAGS = {
  TIER_1: { name: 'Vua Trốn Học', color: '#ef4444' }, // 3..5 ca
  TIER_2: { name: 'Bóng Ma Phòng Xưởng', color: '#7c3aed' }, // 6..8 ca
  TIER_3: { name: 'Thánh Hứa Lèo', color: '#000000' }, // >= 9 ca
};

@Injectable()
export class CurseEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expLedger: ExpLedgerService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * T032: Xử lý vắng không phép (FR-polyfactory-190 -> 194)
   * - Phạt -20 EXP
   * - Đứt chuỗi 5 ca giải trừ (consecutivePresentCount = 0)
   * - unexcusedCount tăng +1
   * - Đạt >= 3 lần vắng: Bị phong ấn (isCursed = true) & gắn Tag Xấu tương ứng khóa cứng
   */
  async handleUnexcusedAbsence(userId: string) {
    // 1. Phạt -20 EXP vào sổ cái
    await this.expLedger.recordTransaction(userId, -20, 'UNEXCUSED_ABSENCE', 'Phạt vắng không phép');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newUnexcused = user.unexcusedCount + 1;
    const isCursed = newUnexcused >= 3;

    // 2. Cập nhật User
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        unexcusedCount: newUnexcused,
        consecutivePresentCount: 0,
        isCursed,
      },
    });

    // 3. Nếu bị phong ấn -> Gắn Tag Xấu tương ứng
    if (isCursed) {
      let activeCurse = CURSE_TAGS.TIER_1;
      if (newUnexcused >= 9) {
        activeCurse = CURSE_TAGS.TIER_3;
      } else if (newUnexcused >= 6) {
        activeCurse = CURSE_TAGS.TIER_2;
      }

      // Đảm bảo BadgeTag tồn tại
      const tag = await this.prisma.badgeTag.upsert({
        where: { name: activeCurse.name },
        create: {
          name: activeCurse.name,
          colorCode: activeCurse.color,
          tagType: TagType.CURSE_DEBUFF,
          isCurse: true,
        },
        update: {},
      });

      // Gỡ các Tag Xấu khác nếu vừa nâng cấp
      const allCurseTags = await this.prisma.badgeTag.findMany({
        where: { isCurse: true },
      });
      const otherCurseTagIds = allCurseTags.filter((t) => t.id !== tag.id).map((t) => t.id);

      if (otherCurseTagIds.length > 0) {
        await this.prisma.userTag.deleteMany({
          where: {
            userId,
            tagId: { in: otherCurseTagIds },
          },
        });
      }

      // Khóa Tag Xấu hiện tại
      await this.prisma.userTag.upsert({
        where: {
          userId_tagId: { userId, tagId: tag.id },
        },
        create: {
          userId,
          tagId: tag.id,
          isDisplayed: true,
          isLocked: true,
        },
        update: {
          isDisplayed: true,
          isLocked: true,
        },
      });
    }
  }

  /**
   * T032: Xử lý ca trực có mặt hợp lệ (giải trừ phong ấn sau 5 ca liên tiếp)
   */
  async handleValidPresence(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isCursed) return;

    const newStreak = user.consecutivePresentCount + 1;

    // Đủ 5 ca có mặt liên tiếp -> Hóa giải phong ấn và reset bộ đếm vắng về 0
    if (newStreak >= 5) {
      await this.removeCurseFromUser(userId);

      if (this.eventEmitter) {
        this.eventEmitter.emit('gamification.curse_lifted', {
          userId,
          reason: 'Hoàn thành chuỗi 5 ca có mặt liên tiếp',
        });
      }
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          consecutivePresentCount: newStreak,
        },
      });
    }
  }

  /**
   * T032: Mentor xóa tội / gỡ phong ấn đặc cách
   */
  async pardonCurse(mentorId: string, userId: string) {
    return this.removeCurseFromUser(userId);
  }

  private async removeCurseFromUser(userId: string) {
    // 1. Gỡ toàn bộ Tag Xấu (isCurse = true)
    const curseTags = await this.prisma.badgeTag.findMany({
      where: { isCurse: true },
    });

    if (curseTags.length > 0) {
      await this.prisma.userTag.deleteMany({
        where: {
          userId,
          tagId: { in: curseTags.map((t) => t.id) },
        },
      });
    }

    // 2. Reset trạng thái phong ấn
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isCursed: false,
        unexcusedCount: 0,
        consecutivePresentCount: 0,
      },
    });
  }
}
