import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { TrainingService } from './training.service';
import { SubmissionStatus, UserRole, TaskType, TagType } from '@prisma/client';

describe('TrainingService (T028 & T029)', () => {
  it('T028 createTask validates title and Google Docs/Drive link (E-polyfactory-130)', async () => {
    const service = new TrainingService({} as any, {} as any, {} as any);

    // Empty title
    await assert.rejects(
      async () => {
        await service.createTask('creator1', {
          title: '',
          googleDocsUrl: 'https://docs.google.com/document/d/123',
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-130');
        return true;
      },
    );

    // Invalid docs link
    await assert.rejects(
      async () => {
        await service.createTask('creator1', {
          title: 'Bài tập 1',
          googleDocsUrl: 'https://random-link.com/file',
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-130');
        return true;
      },
    );

    // Valid creation
    let createdData: any = null;
    const prismaMock: any = {
      trainingTask: {
        create: async (args: any) => {
          createdData = args.data;
          return { id: 'task1', ...args.data };
        },
      },
    };

    const validService = new TrainingService(prismaMock, {} as any, {} as any);
    const result = await validService.createTask('creator1', {
      title: 'Bài tập 1: Dựng Web với HTML/CSS',
      googleDocsUrl: 'https://docs.google.com/document/d/xyz',
      expReward: 25,
      isMandatory: true,
    });

    assert.strictEqual(result.id, 'task1');
    assert.strictEqual(createdData.title, 'Bài tập 1: Dựng Web với HTML/CSS');
    assert.strictEqual(createdData.expReward, 25);
    assert.strictEqual(createdData.isMandatory, true);
  });

  it('T028 submitTask checks domain (E-polyfactory-133), completed block (E-polyfactory-134), and manages versions', async () => {
    let submissions: any[] = [];
    const prismaMock: any = {
      trainingTask: {
        findUnique: async () => ({ id: 'task1', title: 'Task 1' }),
      },
      taskSubmission: {
        findFirst: async (args: any) => {
          return submissions.find(
            (s) => s.taskId === args.where.taskId && s.userId === args.where.userId && s.status === args.where.status,
          );
        },
        findMany: async (args: any) => {
          return submissions
            .filter((s) => s.taskId === args.where.taskId && s.userId === args.where.userId)
            .sort((a, b) => b.versionNumber - a.versionNumber);
        },
        updateMany: async (args: any) => {
          submissions
            .filter((s) => s.taskId === args.where.taskId && s.userId === args.where.userId)
            .forEach((s) => {
              s.isLatest = false;
            });
        },
        create: async (args: any) => {
          const item = { id: `sub_${submissions.length + 1}`, ...args.data };
          submissions.push(item);
          return item;
        },
      },
    };

    const service = new TrainingService(prismaMock, {} as any, {} as any);

    // 1. Invalid domain
    await assert.rejects(
      async () => {
        await service.submitTask('user1', 'task1', 'https://bad-site.com/code.zip');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-133');
        return true;
      },
    );

    // 2. First submission (version 1, isLatest = true)
    const sub1 = await service.submitTask('user1', 'task1', 'https://github.com/poly/repo/pull/1');
    assert.strictEqual(sub1.versionNumber, 1);
    assert.strictEqual(sub1.isLatest, true);

    // 3. Second submission (revision: version 2, isLatest = true, sub1 becomes false)
    const sub2 = await service.submitTask('user1', 'task1', 'https://github.com/poly/repo/pull/2');
    assert.strictEqual(sub2.versionNumber, 2);
    assert.strictEqual(sub2.isLatest, true);
    assert.strictEqual(submissions[0].isLatest, false);

    // 4. Mark sub2 as COMPLETED then try to submit again -> E-polyfactory-134
    submissions[1].status = SubmissionStatus.COMPLETED;
    await assert.rejects(
      async () => {
        await service.submitTask('user1', 'task1', 'https://github.com/poly/repo/pull/3');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-134');
        return true;
      },
    );
  });

  it('T028 reviewSubmission blocks self-review (E-polyfactory-135) and awards EXP on COMPLETED', async () => {
    let recordedExp = 0;
    const expLedgerMock: any = {
      recordTransaction: async (userId: string, amount: number) => {
        recordedExp += amount;
      },
    };

    const submissionData = {
      id: 'sub1',
      userId: 'user1',
      taskId: 'task1',
      status: SubmissionStatus.SUBMITTED,
      task: { id: 'task1', title: 'HTML Exercise', expReward: 30 },
    };

    const prismaMock: any = {
      taskSubmission: {
        findUnique: async () => ({ ...submissionData, task: { ...submissionData.task } }),
        update: async (args: any) => {
          submissionData.status = args.data.status;
          return { ...submissionData, ...args.data };
        },
      },
    };

    const service = new TrainingService(prismaMock, {} as any, expLedgerMock);

    // Self-review rejected (reviewerId === sub.userId)
    await assert.rejects(
      async () => {
        await service.reviewSubmission('user1', 'sub1', SubmissionStatus.COMPLETED);
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-135');
        return true;
      },
    );

    // Valid review by lead/mentor
    const reviewed = await service.reviewSubmission('lead1', 'sub1', SubmissionStatus.COMPLETED, 'Tốt lắm!');
    assert.strictEqual(reviewed.status, SubmissionStatus.COMPLETED);
    assert.strictEqual(recordedExp, 30);
  });

  it('T029 getTraineeProgress checks 100% mandatory tasks and >= 70% attendance rate', async () => {
    const user = {
      id: 'trainee1',
      role: UserRole.TRAINEE,
      trainingLevelId: 'lvl1',
      trainingLevel: { orderIndex: 1 },
    };

    const mandatoryTasks = [
      { id: 't1', levelId: 'lvl1', isMandatory: true },
      { id: 't2', levelId: 'lvl1', isMandatory: true },
    ];

    const prismaMock: any = {
      user: {
        findUnique: async () => user,
      },
      trainingTask: {
        findMany: async () => mandatoryTasks,
      },
      taskSubmission: {
        findMany: async () => [{ taskId: 't1', status: SubmissionStatus.COMPLETED }], // only 1/2 done
      },
    };

    const reportsMock: any = {
      getUserAttendanceMetrics: async () => ({ attendanceRate: 85 }),
    };

    const service = new TrainingService(prismaMock, reportsMock, {} as any);
    const progress = await service.getTraineeProgress('trainee1');

    assert.strictEqual(progress.completedMandatory, 1);
    assert.strictEqual(progress.totalMandatory, 2);
    assert.strictEqual(progress.attendanceRate, 85);
    // Not eligible because not 100% mandatory tasks
    assert.strictEqual(progress.isEligibleForPromotion, false);
  });

  it('T029 approveLevel graduates trainee through Lv1 -> Lv2 -> Tốt nghiệp Training & role MEMBER', async () => {
    let currentExp = 0;
    const expLedgerMock: any = {
      recordTransaction: async (userId: string, amount: number) => {
        currentExp += amount;
      },
    };

    const levels = [
      { id: 'lvl1', orderIndex: 1, name: 'Level 1' },
      { id: 'lvl2', orderIndex: 2, name: 'Level 2' },
      { id: 'lvl3', orderIndex: 3, name: 'Level 3' },
    ];

    let userData: any = {
      id: 'trainee_grad',
      role: UserRole.TRAINEE,
      trainingLevelId: 'lvl1',
      trainingLevel: levels[0],
    };

    const userTags: any[] = [];
    const prismaMock: any = {
      user: {
        findUnique: async () => userData,
        update: async (args: any) => {
          userData = { ...userData, ...args.data };
          if (args.data.trainingLevelId) {
            userData.trainingLevel = levels.find((l) => l.id === args.data.trainingLevelId);
          }
          return userData;
        },
      },
      trainingLevel: {
        findMany: async () => levels,
      },
      badgeTag: {
        upsert: async (args: any) => ({ id: `tag_${args.where.name}`, name: args.where.name }),
      },
      userTag: {
        upsert: async (args: any) => {
          userTags.push(args.create || args.update);
          return { id: 'ut1', ...args.create };
        },
      },
    };

    const service = new TrainingService(prismaMock, {} as any, expLedgerMock);

    // Step 1: Promote Level 1 -> receives Lv1 tag, moves to Level 2
    const step1 = await service.approveLevel('lead1', 'trainee_grad');
    assert.strictEqual(step1.promotedTo, 'LEVEL_2');
    assert.strictEqual(step1.awardedTag, 'Lv1');
    assert.strictEqual(userData.trainingLevelId, 'lvl2');
    assert.strictEqual(currentExp, 50);

    // Step 2: Promote Level 2 -> receives Lv2 tag, moves to Level 3
    const step2 = await service.approveLevel('lead1', 'trainee_grad');
    assert.strictEqual(step2.promotedTo, 'LEVEL_3');
    assert.strictEqual(step2.awardedTag, 'Lv2');
    assert.strictEqual(userData.trainingLevelId, 'lvl3');
    assert.strictEqual(currentExp, 100);

    // Step 3: Promote Level 3 -> receives Tốt nghiệp Training tag, role = MEMBER, unlocks 6 positions
    const step3 = await service.approveLevel('lead1', 'trainee_grad');
    assert.strictEqual(step3.promotedTo, 'MEMBER');
    assert.strictEqual(step3.awardedTag, 'Tốt nghiệp Training');
    assert.strictEqual(step3.unlockPositionSelection, true);
    assert.strictEqual(userData.role, UserRole.MEMBER);
    assert.strictEqual(currentExp, 150);
  });

  it('T028 & T067 getTasks queries training tasks with level filtering', async () => {
    const mockTasks = [
      { id: 'task-1', title: 'Task 1', levelId: 'lvl1', isMandatory: true },
      { id: 'task-2', title: 'Task 2', levelId: 'lvl2', isMandatory: false },
    ];

    const prismaMock: any = {
      trainingTask: {
        findMany: async (args: any) => {
          if (args?.where?.levelId) {
            return mockTasks.filter((t) => t.levelId === args.where.levelId);
          }
          return mockTasks;
        },
      },
    };

    const service = new TrainingService(prismaMock, {} as any, {} as any);
    const all = await service.getTasks();
    assert.strictEqual(all.length, 2);

    const filtered = await service.getTasks('lvl1');
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'task-1');
  });
});
