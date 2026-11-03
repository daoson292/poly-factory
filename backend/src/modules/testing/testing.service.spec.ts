import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { TestCasesService } from './test-cases.service';
import { TestRunsService } from './test-runs.service';
import { BugsService } from './bugs.service';
import { TestingExpService } from './testing-exp.service';
import {
  TestCasePriority,
  TestResultStatus,
  BugSeverity,
  BugStatus,
  BugResolution,
  UserRole,
} from '@prisma/client';

describe('Testing Module M17 (T047 -> T054)', () => {
  it('T047 TestCasesService generates TC-01 and handles soft delete', async () => {
    const suites: any[] = [];
    const testCases: any[] = [];

    const prismaMock: any = {
      testSuite: {
        create: async (args: any) => {
          const item = { id: 'suite_1', ...args.data };
          suites.push(item);
          return item;
        },
      },
      testCase: {
        count: async () => testCases.length,
        create: async (args: any) => {
          const item = { id: `tc_${testCases.length + 1}`, ...args.data };
          testCases.push(item);
          return item;
        },
        update: async (args: any) => {
          const item = testCases.find((t) => t.id === args.where.id);
          Object.assign(item, args.data);
          return item;
        },
      },
    };

    const service = new TestCasesService(prismaMock);

    // 1. Tạo TestSuite
    const suite = await service.createSuite('proj1', { name: 'Authentication Suite' });
    assert.strictEqual(suite.id, 'suite_1');

    // 2. Tạo TestCase -> sinh mã TC-01
    const tc1 = await service.createTestCase('tester1', 'proj1', {
      suiteId: suite.id,
      title: 'Kiểm tra đăng nhập đúng thông tin',
      priority: TestCasePriority.HIGH,
      steps: [{ step_no: 1, action: 'Nhập email và pass', expected_result: 'Đăng nhập thành công' }],
    });
    assert.strictEqual(tc1.code, 'TC-01');
    assert.strictEqual(tc1.isDeleted, false);

    // 3. Xóa mềm
    const deleted = await service.deleteTestCase(tc1.id);
    assert.strictEqual(deleted.isDeleted, true);
  });

  it('T048 & T049 TestRunsService creates immutable snapshot and enforces FAILED actualResult (E-polyfactory-301)', async () => {
    const testCases = [
      { id: 'tc1', code: 'TC-01', title: 'Login Test', priority: 'HIGH', preconditions: 'None', steps: [] },
    ];

    let createdResult: any = null;
    const members = [
      { projectId: 'proj1', userId: 'tester1', canTest: true, isProjectLead: false },
      { projectId: 'proj1', userId: 'dev1', canTest: false, isProjectLead: false },
    ];

    const prismaMock: any = {
      testCase: {
        findMany: async () => testCases,
      },
      testRun: {
        create: async (args: any) => ({ id: 'run1', ...args.data }),
        findUnique: async () => ({
          id: 'run1',
          projectId: 'proj1',
          status: 'ACTIVE',
          results: [createdResult],
        }),
      },
      testResult: {
        create: async (args: any) => {
          createdResult = { id: 'res1', ...args.data, testRun: { id: 'run1', projectId: 'proj1', status: 'ACTIVE' } };
          return createdResult;
        },
        findUnique: async () => createdResult,
        update: async (args: any) => {
          Object.assign(createdResult, args.data);
          return createdResult;
        },
      },
      projectMember: {
        findFirst: async (args: any) => members.find((m) => m.projectId === args.where.projectId && m.userId === args.where.userId),
        updateMany: async () => {},
      },
    };

    const testingExpMock: any = {
      awardTestingExp: async () => {},
    };

    const service = new TestRunsService(prismaMock, testingExpMock);

    // 1. Tạo TestRun -> Lưu snapshot bất biến
    const run = await service.createTestRun('lead1', 'proj1', {
      name: 'Sprint 1 Run',
      testCaseIds: ['tc1'],
    });
    assert.ok(run);
    assert.strictEqual(createdResult.caseSnapshot.code, 'TC-01');

    // 2. Dev không có quyền canTest cố tình chấm kết quả -> E-polyfactory-300
    await assert.rejects(
      async () => {
        await service.executeTestResult('dev1', UserRole.MEMBER, 'res1', {
          status: TestResultStatus.PASSED,
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-300');
        return true;
      },
    );

    // 3. Tester chấm FAILED mà không có actualResult hoặc bugId -> E-polyfactory-301
    await assert.rejects(
      async () => {
        await service.executeTestResult('tester1', UserRole.MEMBER, 'res1', {
          status: TestResultStatus.FAILED,
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-301');
        return true;
      },
    );

    // 4. Tester chấm FAILED có actualResult -> Hợp lệ
    const passedRes = await service.executeTestResult('tester1', UserRole.MEMBER, 'res1', {
      status: TestResultStatus.FAILED,
      actualResult: 'Báo lỗi 500 khi submit form',
    });
    assert.strictEqual(passedRes.status, TestResultStatus.FAILED);
    assert.strictEqual(passedRes.executedById, 'tester1');
  });

  it('T051 & T052 BugsService enforces fixReference (E-polyfactory-303), 4-eyes rule (E-polyfactory-302), and Dev rollback on REOPENED', async () => {
    let bugState: any = {
      id: 'bug1',
      code: 'BUG-01',
      projectId: 'proj1',
      status: BugStatus.OPEN,
      severity: BugSeverity.HIGH,
      severityConfirmedByLead: false,
      reporterId: 'tester1',
      fixedById: null,
      verifiedById: null,
      expAwardedTester: false,
      expActiveDev: false,
      project: {
        members: [{ userId: 'tester1' }, { userId: 'dev1' }, { userId: 'lead1' }],
      },
    };

    let expAwards: any[] = [];
    let expRevokes: any[] = [];

    const prismaMock: any = {
      bug: {
        count: async () => 0,
        create: async (args: any) => {
          bugState = { ...bugState, ...args.data };
          return bugState;
        },
        findUnique: async () => bugState,
        update: async (args: any) => {
          Object.assign(bugState, args.data);
          return bugState;
        },
      },
      bugHistory: {
        create: async () => {},
      },
    };

    const testingExpMock: any = {
      awardTestingExp: async (userId: string, projId: string, amount: number, source: string) => {
        expAwards.push({ userId, amount, source });
      },
      revokeDevExp: async (devId: string, projId: string, amount: number, reason: string) => {
        expRevokes.push({ devId, amount, reason });
      },
    };

    const service = new BugsService(prismaMock, testingExpMock);

    // 1. Khởi tạo Bug
    await service.createBug('tester1', 'proj1', {
      title: 'Lỗi nút thanh toán không phản hồi',
      stepsToReproduce: 'Bấm nút',
      expectedResult: 'Hiện cổng',
      actualResult: 'Không phản hồi',
    });
    assert.strictEqual(bugState.code, 'BUG-01');

    // 2. Dev báo FIXED nhưng quên fixReference -> E-polyfactory-303
    await assert.rejects(
      async () => {
        await service.updateBugStatus('dev1', UserRole.MEMBER, 'bug1', {
          status: BugStatus.RESOLVED,
          resolution: BugResolution.FIXED,
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-303');
        return true;
      },
    );

    // 3. Dev báo FIXED có commit hash -> Hợp lệ
    await service.updateBugStatus('dev1', UserRole.MEMBER, 'bug1', {
      status: BugStatus.RESOLVED,
      resolution: BugResolution.FIXED,
      fixReference: 'commit_hash_123',
    });
    assert.strictEqual(bugState.status, BugStatus.RESOLVED);
    assert.strictEqual(bugState.fixedById, 'dev1');

    // 4. QUY TẮC 4 MẮT: Dev tự nghiệm thu và đóng bug mình sửa -> E-polyfactory-302
    await assert.rejects(
      async () => {
        await service.updateBugStatus('dev1', UserRole.MEMBER, 'bug1', {
          status: BugStatus.CLOSED,
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-302');
        return true;
      },
    );

    // 5. Tester hoặc Lead nghiệm thu đóng bug -> Thành công và cộng EXP (Tester +10, Dev +5)
    await service.updateBugStatus('tester1', UserRole.MEMBER, 'bug1', {
      status: BugStatus.CLOSED,
      resolution: BugResolution.FIXED,
    });
    assert.strictEqual(bugState.status, BugStatus.CLOSED);
    assert.strictEqual(bugState.verifiedById, 'tester1');
    assert.strictEqual(expAwards.length, 2);
    assert.strictEqual(expAwards[0].userId, 'tester1');
    assert.strictEqual(expAwards[0].amount, 10);
    assert.strictEqual(expAwards[1].userId, 'dev1');
    assert.strictEqual(expAwards[1].amount, 5);

    // 6. Bug bị REOPENED -> Thu hồi -5 EXP của Dev
    await service.updateBugStatus('tester1', UserRole.MEMBER, 'bug1', {
      status: BugStatus.REOPENED,
      note: 'Vẫn tái diễn lỗi',
    });
    assert.strictEqual(bugState.status, BugStatus.REOPENED);
    assert.strictEqual(expRevokes.length, 1);
    assert.strictEqual(expRevokes[0].devId, 'dev1');
    assert.strictEqual(expRevokes[0].amount, 5);
  });

  it('T053 TestingExpService enforces 100 EXP / person / project / month cap', async () => {
    let recordedTxs: any[] = [];
    const prismaMock: any = {
      expTransaction: {
        findMany: async () => recordedTxs,
      },
    };

    const expLedgerMock: any = {
      recordTransaction: async (userId: string, amount: number, source: string, reason: string) => {
        recordedTxs.push({ amount, source, reason, createdAt: new Date() });
      },
    };

    const service = new TestingExpService(prismaMock, expLedgerMock);

    // Lần 1: Nhận 80 EXP -> Thành công
    const res1 = await service.awardTestingExp('tester1', 'proj1', 80, 'BUG_VALID_REPORTED', 'Found bugs');
    assert.strictEqual(res1.awarded, 80);
    assert.strictEqual(res1.capped, false);

    // Lần 2: Nhận tiếp 30 EXP -> Bị khóa trần chỉ nhận 20 EXP (đạt đúng 100 EXP)
    const res2 = await service.awardTestingExp('tester1', 'proj1', 30, 'BUG_VALID_REPORTED', 'Found more bugs');
    assert.strictEqual(res2.awarded, 20);
    assert.strictEqual(res2.capped, true);

    // Lần 3: Đã đạt 100 EXP trong tháng -> Nhận 0 EXP
    const res3 = await service.awardTestingExp('tester1', 'proj1', 10, 'BUG_VALID_REPORTED', 'Found another');
    assert.strictEqual(res3.awarded, 0);
    assert.strictEqual(res3.capped, true);
  });
});
