import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { CosmeticsService } from './cosmetics/cosmetics.service';
import { BadgesService } from './badges/badges.service';
import { AchievementsService } from './achievements/achievements.service';
import { QuestsService } from './quests/quests.service';
import { RewardCoordinatorService } from '../core/reward-coordinator.service';
import { AdminPortalService } from '../../admin-portal/admin-portal.service';
import { ExpLedgerService } from '../core/exp-ledger.service';
import { LevelEngineService } from '../core/level-engine.service';
import { CurseEngineService } from '../core/curse-engine.service';
import { TagType, UserRole, UserStatus } from '@prisma/client';

describe('Gamification Plugins & Expanded Leaderboards (T080 -> T085)', () => {
  it('T080 CosmeticsService: level check and unequip logic', async () => {
    const cosmetics = [
      { id: 'c_frame_gold', name: 'Khung Vàng', requiredLevel: 5, cosmeticType: 'AVATAR_FRAME' },
      { id: 'c_frame_novice', name: 'Khung Tân Binh', requiredLevel: 1, cosmeticType: 'AVATAR_FRAME' },
    ];
    const userCosmetics: any[] = [];

    const prismaMock: any = {
      user: {
        findUnique: async () => ({ id: 'usr_1', currentLevel: 2 }),
      },
      cosmetic: {
        findUnique: async (args: any) => cosmetics.find((c) => c.id === args.where.id) || null,
      },
      userCosmetic: {
        findMany: async () => userCosmetics,
        upsert: async (args: any) => {
          const item = { id: `uc_${userCosmetics.length + 1}`, ...args.create, isEquipped: true };
          userCosmetics.push(item);
          return item;
        },
        update: async (args: any) => {
          const item = userCosmetics.find((uc) => uc.id === args.where.id);
          if (item) Object.assign(item, args.data);
          return item;
        },
      },
    };

    const service = new CosmeticsService(prismaMock);

    // Fail: Level 2 user cannot equip level 5 cosmetic
    await assert.rejects(
      async () => {
        await service.equipCosmetic('usr_1', 'c_frame_gold');
      },
      (err: any) => err.response?.errorCode === 'E-polyfactory-180',
    );

    // Success: Level 2 user can equip level 1 cosmetic
    const equipped = await service.equipCosmetic('usr_1', 'c_frame_novice');
    assert.strictEqual(equipped.isEquipped, true);
  });

  it('T082 BadgesService: locked curse badge cannot be hidden', async () => {
    const userTags = [
      {
        userId: 'usr_cursed',
        tagId: 'tag_ghost',
        isDisplayed: true,
        isLocked: true, // Tag Xấu bị phong ấn
        tag: { id: 'tag_ghost', name: 'Bóng Ma Phòng Xưởng', isCurse: true },
      },
    ];

    const prismaMock: any = {
      userTag: {
        findUnique: async () => userTags[0],
        update: async (args: any) => {
          Object.assign(userTags[0], args.data);
          return userTags[0];
        },
      },
    };

    const service = new BadgesService(prismaMock);

    // Fail: User cannot hide a locked curse tag
    await assert.rejects(
      async () => {
        await service.toggleDisplayTag('usr_cursed', 'tag_ghost', false);
      },
      (err: any) => err.response?.errorCode === 'E-polyfactory-192',
    );
  });

  it('T083 AchievementsService: unlocks milestone and awards +50 EXP', async () => {
    const tags: any[] = [];
    const userTags: any[] = [];
    const expTxs: any[] = [];

    const prismaMock: any = {
      badgeTag: {
        upsert: async (args: any) => {
          const t = { id: `tag_${tags.length + 1}`, ...args.create };
          tags.push(t);
          return t;
        },
      },
      userTag: {
        findUnique: async () => null,
        create: async (args: any) => {
          const ut = { id: `ut_${userTags.length + 1}`, ...args.data };
          userTags.push(ut);
          return ut;
        },
      },
      expTransaction: {
        create: async (args: any) => {
          expTxs.push(args.data);
          return args.data;
        },
      },
      user: {
        findUnique: async () => ({ id: 'usr_ach', currentExp: 0, currentLevel: 1, totalExpEarned: 0 }),
        update: async () => {},
      },
      $transaction: async (fn: any) => fn(prismaMock),
    };

    const levelEngine = new LevelEngineService();
    const expLedger = new ExpLedgerService(prismaMock, levelEngine);
    const service = new AchievementsService(prismaMock, expLedger);

    const result = await service.unlockAchievement('usr_ach', 'ACH_CODE_WARRIOR');
    assert.strictEqual(result?.unlocked, true);
    assert.strictEqual(result?.expAwarded, 50);
  });

  it('T084 QuestsService: tracks daily/weekly progress and awards claim', async () => {
    const expTxs: any[] = [];
    const prismaMock: any = {
      attendance: {
        count: async () => 2, // User has 2 shifts
      },
      expTransaction: {
        create: async (args: any) => {
          expTxs.push(args.data);
          return args.data;
        },
      },
      user: {
        findUnique: async () => ({ id: 'usr_q', currentExp: 0, currentLevel: 1, totalExpEarned: 0 }),
        update: async () => {},
      },
      $transaction: async (fn: any) => fn(prismaMock),
    };

    const levelEngine = new LevelEngineService();
    const expLedger = new ExpLedgerService(prismaMock, levelEngine);
    const service = new QuestsService(prismaMock, expLedger);

    const quests = await service.getDailyAndWeeklyQuests('usr_q');
    assert.ok(quests.daily.length >= 2);
    assert.strictEqual(quests.daily[0].isCompleted, true);

    const claimResult = await service.claimQuestReward('usr_q', 'q_daily_shift');
    assert.strictEqual(claimResult.success, true);
    assert.strictEqual(claimResult.expAwarded, 10);
  });

  it('T081 AdminPortalService: manages cosmetic catalog', async () => {
    const cosmetics: any[] = [];
    const prismaMock: any = {
      cosmetic: {
        create: async (args: any) => {
          const item = { id: `cos_${cosmetics.length + 1}`, ...args.data };
          cosmetics.push(item);
          return item;
        },
        findMany: async () => cosmetics,
        delete: async (args: any) => {
          const idx = cosmetics.findIndex((c) => c.id === args.where.id);
          if (idx !== -1) cosmetics.splice(idx, 1);
          return { success: true };
        },
      },
    };

    const adminService = new AdminPortalService(prismaMock, {} as any, {} as any);
    const item = await adminService.createCosmeticItem({
      name: 'Khung Avatar Phượng Hoàng',
      cosmeticType: 'AVATAR_FRAME_GIF' as any,
      filePath: '/storage/cosmetics/phoenix_frame.gif',
      requiredLevel: 10,
    });
    assert.strictEqual(item.name, 'Khung Avatar Phượng Hoàng');

    const list = await adminService.listCosmeticItems();
    assert.strictEqual(list.length, 1);

    await adminService.deleteCosmeticItem(item.id);
    const afterDelete = await adminService.listCosmeticItems();
    assert.strictEqual(afterDelete.length, 0);
  });
});
