import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { LevelEngineService } from './level-engine.service';
import { ExpLedgerService } from './exp-ledger.service';
import { CurseEngineService, CURSE_TAGS } from './curse-engine.service';
import { RewardCoordinatorService } from './reward-coordinator.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Gamification Core (T031, T032, T033)', () => {
  it('T031 LevelEngineService calculates tiered levels correctly matching SRS 6.7', () => {
    const engine = new LevelEngineService();

    assert.strictEqual(engine.calculateLevel(0), 1);
    assert.strictEqual(engine.calculateLevel(49), 1);
    assert.strictEqual(engine.calculateLevel(50), 2);
    assert.strictEqual(engine.calculateLevel(450), 10);
    assert.strictEqual(engine.calculateLevel(500), 11);
    assert.strictEqual(engine.calculateLevel(1400), 20);
    assert.strictEqual(engine.calculateLevel(2850), 30);
    assert.strictEqual(engine.calculateLevel(4800), 40);
  });

  it('T031 ExpLedgerService enforces non-negative balance, preserves highest level, and emits level_up', async () => {
    let emittedEvent: any = null;
    const emitterMock: any = {
      emit: (evt: string, payload: any) => {
        emittedEvent = { evt, payload };
      },
    };

    let userState = {
      id: 'u1',
      currentExp: 10,
      totalExpEarned: 50,
      currentLevel: 2,
    };

    const txStore: any[] = [];
    const prismaMock: any = {
      user: {
        findUnique: async () => ({ ...userState }),
        update: async (args: any) => {
          userState = { ...userState, ...args.data };
          return userState;
        },
      },
      expTransaction: {
        findFirst: async (args: any) => {
          return txStore.find(
            (t) =>
              t.userId === args.where.userId &&
              t.source === args.where.source &&
              t.referenceId === args.where.referenceId,
          ) || null;
        },
        create: async (args: any) => {
          const item = { id: `tx_${Date.now()}`, ...args.data };
          txStore.push(item);
          return item;
        },
      },
    };

    const levelEngine = new LevelEngineService();
    const ledger = new ExpLedgerService(prismaMock, levelEngine, emitterMock);

    // 1. Trừ -20 EXP khi chỉ có 10 EXP -> Chỉ trừ -10, số dư về 0, không âm
    const txPenalty = await ledger.recordTransaction('u1', -20, 'TEST_PENALTY', 'Phạt');
    assert.strictEqual(txPenalty?.amount, -10);
    assert.strictEqual(userState.currentExp, 0);
    // Level được bảo toàn không tụt
    assert.strictEqual(userState.currentLevel, 2);

    // 2. Thêm +500 EXP -> Tổng lên 550 EXP -> Lên Level 11 -> Phát sự kiện level_up
    await ledger.recordTransaction('u1', 500, 'TEST_EARN', 'Thưởng lớn');
    assert.strictEqual(userState.currentExp, 500);
    assert.strictEqual(userState.totalExpEarned, 550);
    assert.strictEqual(userState.currentLevel, 11);
    assert.strictEqual(emittedEvent.evt, 'gamification.level_up');
    assert.strictEqual(emittedEvent.payload.newLevel, 11);

    // 3. BR-polyfactory-314 Idempotency: Gửi lại giao dịch cùng refId -> Không cộng EXP lần 2
    const firstTx = await ledger.recordTransaction('u1', 20, 'ATTENDANCE_NORMAL', 'Điểm danh', 'ref_attend_101');
    assert.strictEqual(userState.currentExp, 520);
    const dupTx = await ledger.recordTransaction('u1', 20, 'ATTENDANCE_NORMAL', 'Điểm danh', 'ref_attend_101');
    assert.strictEqual(dupTx?.id, firstTx?.id);
    assert.strictEqual(userState.currentExp, 520); // Vẫn là 520, không bị nhân đôi lên 540
  });

  it('T032 CurseEngineService transitions 3 curse tiers and lifts curse after 5 consecutive present shifts', async () => {
    let emittedCurseEvent: any = null;
    const emitterMock: any = {
      emit: (evt: string, payload: any) => {
        emittedCurseEvent = { evt, payload };
      },
    };

    let userState = {
      id: 'cursed_user',
      unexcusedCount: 0,
      consecutivePresentCount: 3,
      isCursed: false,
    };

    const userTags: any[] = [];
    const prismaMock: any = {
      user: {
        findUnique: async () => ({ ...userState }),
        update: async (args: any) => {
          userState = { ...userState, ...args.data };
          return userState;
        },
      },
      badgeTag: {
        upsert: async (args: any) => ({ id: `tag_${args.where.name}`, name: args.where.name, isCurse: true }),
        findMany: async () => [
          { id: 'tag_Vua Trốn Học', name: 'Vua Trốn Học', isCurse: true },
          { id: 'tag_Bóng Ma Phòng Xưởng', name: 'Bóng Ma Phòng Xưởng', isCurse: true },
          { id: 'tag_Thánh Hứa Lèo', name: 'Thánh Hứa Lèo', isCurse: true },
        ],
      },
      userTag: {
        upsert: async (args: any) => {
          const item = { id: `ut_${args.where.userId_tagId.tagId}`, ...args.create };
          userTags.push(item);
          return item;
        },
        deleteMany: async (args: any) => {
          const toDelete = args.where.tagId.in;
          for (let i = userTags.length - 1; i >= 0; i--) {
            if (toDelete.includes(userTags[i].tagId)) {
              userTags.splice(i, 1);
            }
          }
        },
      },
    };

    const expLedgerMock: any = {
      recordTransaction: async () => {},
    };

    const curseEngine = new CurseEngineService(prismaMock, expLedgerMock, emitterMock);

    // 1. Vắng 3 ca liên tiếp -> Chuỗi bị đứt (consecutive = 0), unexcused = 3 -> Bị phong ấn 'Vua Trốn Học'
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    assert.strictEqual(userState.unexcusedCount, 3);
    assert.strictEqual(userState.consecutivePresentCount, 0);
    assert.strictEqual(userState.isCursed, true);
    assert.ok(userTags.some((t) => t.tagId === 'tag_Vua Trốn Học' && t.isLocked));

    // 2. Vắng thêm 3 ca nữa (tổng 6) -> Nâng cấp lên 'Bóng Ma Phòng Xưởng'
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    assert.strictEqual(userState.unexcusedCount, 6);
    assert.ok(userTags.some((t) => t.tagId === 'tag_Bóng Ma Phòng Xưởng' && t.isLocked));
    assert.ok(!userTags.some((t) => t.tagId === 'tag_Vua Trốn Học')); // Tag cũ đã bị gỡ

    // 3. Vắng thêm 3 ca nữa (tổng 9) -> Nâng cấp lên 'Thánh Hứa Lèo'
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    await curseEngine.handleUnexcusedAbsence('cursed_user');
    assert.strictEqual(userState.unexcusedCount, 9);
    assert.ok(userTags.some((t) => t.tagId === 'tag_Thánh Hứa Lèo' && t.isLocked));

    // 4. Có mặt 4 ca -> streak = 4, vẫn chưa giải trừ
    for (let i = 0; i < 4; i++) {
      await curseEngine.handleValidPresence('cursed_user');
    }
    assert.strictEqual(userState.consecutivePresentCount, 4);
    assert.strictEqual(userState.isCursed, true);

    // 5. Ca thứ 5 có mặt -> Hóa giải phong ấn! Reset unexcusedCount = 0, xóa tag xấu, phát sự kiện
    await curseEngine.handleValidPresence('cursed_user');
    assert.strictEqual(userState.isCursed, false);
    assert.strictEqual(userState.unexcusedCount, 0);
    assert.strictEqual(userState.consecutivePresentCount, 0);
    assert.strictEqual(userTags.length, 0);
    assert.strictEqual(emittedCurseEvent.evt, 'gamification.curse_lifted');
  });

  it('T033 RewardCoordinatorService coordinates events, leaderboard, and mentor pardon', async () => {
    let recordedTransactions: any[] = [];
    const expLedgerMock: any = {
      recordTransaction: async (userId: string, amount: number, source: string, reason: string) => {
        recordedTransactions.push({ userId, amount, source, reason });
      },
    };

    let validPresenceUser: string | null = null;
    let pardonedUser: string | null = null;
    const curseEngineMock: any = {
      handleValidPresence: async (userId: string) => {
        validPresenceUser = userId;
      },
      pardonCurse: async (mentorId: string, userId: string) => {
        pardonedUser = userId;
        return { isCursed: false };
      },
    };

    const mockUsers = [
      { id: 'u1', fullName: 'Nguyen Van A', email: 'anv@fpt.edu.vn', currentExp: 500, totalExpEarned: 1200, currentLevel: 18, role: 'MEMBER', isCursed: false },
      { id: 'u2', fullName: 'Tran Thi B', email: 'btt@fpt.edu.vn', currentExp: 300, totalExpEarned: 800, currentLevel: 14, role: 'MEMBER', isCursed: false },
    ];

    const prismaMock: any = {
      user: {
        findMany: async () => mockUsers,
      },
    };

    const coordinator = new RewardCoordinatorService(prismaMock, expLedgerMock, curseEngineMock);

    // 1. Lắng nghe attendance.present
    await coordinator.handleAttendancePresent({
      userId: 'u1',
      expEarned: 10,
      penalty: 4,
      isWalkIn: false,
    });
    assert.strictEqual(recordedTransactions.length, 2);
    assert.strictEqual(recordedTransactions[0].amount, 10);
    assert.strictEqual(recordedTransactions[1].amount, -4);
    assert.strictEqual(validPresenceUser, 'u1');

    // 2. Bảng xếp hạng
    const leaderboard = await coordinator.getLeaderboard('all', 10);
    assert.strictEqual(leaderboard.length, 2);
    assert.strictEqual(leaderboard[0].rank, 1);
    assert.strictEqual(leaderboard[0].fullName, 'Nguyen Van A');
    assert.strictEqual(leaderboard[1].rank, 2);

    // 3. Mentor pardon
    await coordinator.pardonCurse('mentor1', 'u2');
    assert.strictEqual(pardonedUser, 'u2');
  });
});
