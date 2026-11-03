import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { AuthService } from '../src/modules/auth/auth.service';
import { RoomsService } from '../src/modules/rooms/rooms.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { TestCasesService } from '../src/modules/testing/test-cases.service';
import { TestRunsService } from '../src/modules/testing/test-runs.service';
import { BugsService } from '../src/modules/testing/bugs.service';
import { TestingExpService } from '../src/modules/testing/testing-exp.service';
import { ExpLedgerService } from '../src/modules/gamification/core/exp-ledger.service';
import { LevelEngineService } from '../src/modules/gamification/core/level-engine.service';
import {
  UserRole,
  UserStatus,
  RoomStatus,
  BugSeverity,
  BugStatus,
  BugResolution,
} from '@prisma/client';

describe('PolyFactory Phase 1 E2E Integration Suite (T062)', () => {
  it('E2E Lifecycle: User Onboarding -> Attendance -> Training -> Project & Testing M17', async () => {
    // 1. Storage simulation
    const users: any[] = [];
    const rooms: any[] = [
      {
        id: 'room_p407',
        name: 'P407',
        status: RoomStatus.OPEN,
        revertAt: null,
      },
    ];
    const projects: any[] = [];
    const projectMembers: any[] = [];
    const testSuites: any[] = [];
    const testCases: any[] = [];
    const testRuns: any[] = [];
    const testResults: any[] = [];
    const bugs: any[] = [];
    const bugHistories: any[] = [];
    const expTransactions: any[] = [];

    const eventEmitterMock: any = {
      emit: () => {},
    };

    const jwtMock: any = {
      sign: (payload: any) => `jwt_token_${payload.sub}`,
    };

    const prismaMock: any = {
      user: {
        findUnique: async (args: any) => {
          if (args.where.id) return users.find((u) => u.id === args.where.id) || null;
          if (args.where.email) return users.find((u) => u.email === args.where.email) || null;
          return null;
        },
        create: async (args: any) => {
          const u = {
            id: `usr_${users.length + 1}`,
            role: UserRole.TRAINEE,
            status: UserStatus.PENDING_ACTIVATION,
            tokenVersion: 1,
            currentLevel: 1,
            currentExp: 0,
            positions: [],
            ...args.data,
          };
          users.push(u);
          return u;
        },
        update: async (args: any) => {
          const u = users.find((x) => x.id === args.where.id);
          Object.assign(u, args.data);
          return u;
        },
      },
      roomConfig: {
        findUnique: async () => rooms[0],
        findFirst: async () => rooms[0],
        update: async (args: any) => {
          Object.assign(rooms[0], args.data);
          return rooms[0];
        },
      },
      project: {
        findUnique: async (args: any) => projects.find((p) => p.id === args.where.id) || null,
        findFirst: async (args: any) => projects.find((p) => p.githubRepoUrl === args.where.OR?.[1]?.githubRepoUrl) || null,
        create: async (args: any) => {
          const p = { id: `proj_${projects.length + 1}`, members: [], ...args.data };
          projects.push(p);
          return p;
        },
        update: async (args: any) => {
          const p = projects.find((x) => x.id === args.where.id);
          Object.assign(p, args.data);
          return p;
        },
      },
      projectMember: {
        findUnique: async (args: any) => {
          return projectMembers.find((m) => m.projectId === args.where.projectId_userId?.projectId && m.userId === args.where.projectId_userId?.userId) || null;
        },
        create: async (args: any) => {
          const m = { id: `pm_${projectMembers.length + 1}`, ...args.data };
          projectMembers.push(m);
          return m;
        },
      },
      testSuite: {
        create: async (args: any) => {
          const ts = { id: `ts_${testSuites.length + 1}`, ...args.data };
          testSuites.push(ts);
          return ts;
        },
      },
      testCase: {
        count: async () => testCases.length,
        findMany: async () => testCases,
        create: async (args: any) => {
          const tc = { id: `tc_${testCases.length + 1}`, ...args.data };
          testCases.push(tc);
          return tc;
        },
      },
      testRun: {
        findUnique: async (args: any) => testRuns.find((r) => r.id === args.where.id) || null,
        create: async (args: any) => {
          const tr = { id: `tr_${testRuns.length + 1}`, ...args.data };
          testRuns.push(tr);
          return tr;
        },
      },
      testResult: {
        findUnique: async (args: any) => testResults.find((r) => r.id === args.where.id) || null,
        create: async (args: any) => {
          const res = { id: `res_${testResults.length + 1}`, ...args.data };
          testResults.push(res);
          return res;
        },
      },
      bug: {
        findUnique: async (args: any) => {
          const b = bugs.find((x) => x.id === args.where.id);
          if (!b) return null;
          return {
            ...b,
            project: {
              members: [
                { userId: 'dev_user_1', role: UserRole.MEMBER },
                { userId: 'tester_user_2', role: UserRole.MEMBER },
              ],
            },
          };
        },
        count: async () => bugs.length,
        create: async (args: any) => {
          const b = { id: `bug_${bugs.length + 1}`, ...args.data };
          bugs.push(b);
          return b;
        },
        update: async (args: any) => {
          const b = bugs.find((x) => x.id === args.where.id);
          Object.assign(b, args.data);
          return b;
        },
      },
      bugHistory: {
        create: async (args: any) => {
          const h = { id: `bh_${bugHistories.length + 1}`, ...args.data };
          bugHistories.push(h);
          return h;
        },
      },
      expTransaction: {
        create: async (args: any) => {
          const exp = { id: `exp_${expTransactions.length + 1}`, ...args.data };
          expTransactions.push(exp);
          return exp;
        },
        findMany: async () => expTransactions,
      },
      trainingLevel: {
        findFirst: async () => ({ id: 'lv_1', orderIndex: 1, name: 'Level 1' }),
      },
      $transaction: async (fn: any) => fn(prismaMock),
    };

    // Instantiate Services
    const authService = new AuthService(prismaMock, jwtMock, eventEmitterMock);
    const roomsService = new RoomsService(prismaMock, eventEmitterMock);
    const projectsService = new ProjectsService(prismaMock);
    const levelEngineService = new LevelEngineService();
    const expLedgerService = new ExpLedgerService(prismaMock, levelEngineService);
    const testingExpService = new TestingExpService(prismaMock, expLedgerService);
    const testCasesService = new TestCasesService(prismaMock);
    const testRunsService = new TestRunsService(prismaMock, testingExpService);
    const bugsService = new BugsService(prismaMock, testingExpService);

    // STEP A: Onboard Student via Whitelist
    const whitelistResult = await authService.addMemberToWhitelist(
      {
        email: 'student.e2e@fpt.edu.vn',
        fullName: 'E2E Tester Student',
        role: UserRole.TRAINEE,
      },
      { id: 'mentor_1', role: UserRole.MENTOR },
    );
    assert.strictEqual(whitelistResult.success, true);
    assert.ok(whitelistResult.user?.id);
    assert.strictEqual(whitelistResult.user?.status, UserStatus.PENDING_ACTIVATION);

    // STEP B: Google Auth Login -> Activates Trainee
    const loginResult = await authService.validateGoogleUser({
      email: 'student.e2e@fpt.edu.vn',
      fullName: 'E2E Tester Student',
    });
    assert.strictEqual(loginResult.success, true);
    assert.strictEqual(loginResult.user?.status, UserStatus.ACTIVE);
    assert.ok(loginResult.accessToken);

    // STEP C: Verify Room Status
    const room = await roomsService.getCurrentStatus();
    assert.strictEqual(room.status, RoomStatus.OPEN);

    // STEP D: Create a Project
    const project = await projectsService.createProject('usr_lead', {
      name: 'PolyFactory E2E Testing App',
      githubRepoUrl: 'https://github.com/polyfactory/e2e-app',
    });
    assert.ok(project.id);

    // STEP E: Create TestSuite and TestCase (M17)
    const suite = await testCasesService.createSuite(project.id, {
      name: 'Authentication Test Suite',
      description: 'Covers login & session',
    });
    const testCase = await testCasesService.createTestCase('usr_lead', project.id, {
      suiteId: suite.id,
      title: 'Verify Google login whitelist rejection',
      preconditions: 'User email not in DB',
      steps: [{ step: 1, action: 'Sign in with non-fpt email', expected: 'Reject E-polyfactory-001' }],
      priority: 'HIGH' as any,
    });
    assert.strictEqual(testCase.code, 'TC-01');

    // STEP F: Execute TestRun with Snapshot
    const testRun = await testRunsService.createTestRun('usr_lead', project.id, {
      name: 'Sprint 1 Verification Run',
      testCaseIds: [testCase.id],
    });
    assert.strictEqual(testRun.status, 'ACTIVE');

    // STEP G: Create Bug and enforce 4-eyes rule
    const bug = await bugsService.createBug('usr_lead', project.id, {
      title: 'Whitelist check allows invalid domain',
      stepsToReproduce: 'Attempt login with yahoo.com',
      expectedResult: 'HTTP 403 E-polyfactory-001',
      actualResult: 'HTTP 200 OK',
      severity: BugSeverity.CRITICAL,
    });
    assert.strictEqual(bug.code, 'BUG-01');

    // Developer marks bug RESOLVED with resolution FIXED and fixReference
    await bugsService.updateBugStatus('dev_user_1', UserRole.MEMBER, bug.id, {
      status: BugStatus.RESOLVED,
      resolution: BugResolution.FIXED,
      fixReference: 'commit:1234567890abcdef',
    });

    // 4-eyes rule: Developer CANNOT verify their own fix
    await assert.rejects(
      async () => {
        await bugsService.updateBugStatus('dev_user_1', UserRole.MEMBER, bug.id, {
          status: BugStatus.CLOSED,
        });
      },
      (err: any) => err.response?.errorCode === 'E-polyfactory-302',
    );

    // Independent Tester closes bug
    const closedBug = await bugsService.updateBugStatus('tester_user_2', UserRole.MEMBER, bug.id, {
      status: BugStatus.CLOSED,
    });
    assert.strictEqual(closedBug.status, BugStatus.CLOSED);

    // Reward Tester and Dev with 100 EXP monthly cap
    const expResult = await testingExpService.awardTestingExp(
      'tester_user_2',
      project.id,
      20,
      'BUG_VALID_REPORTED',
      'Reported CRITICAL bug BUG-01',
      bug.id,
    );
    assert.strictEqual(expResult.awarded, 20); // Critical bug = +20 EXP
  });
});
