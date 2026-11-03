import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ProjectsService } from './projects.service';
import { ProjectCertificateService } from './project-certificate.service';
import { ProjectVisibility, UserRole, Position, ApplicationStatus, BugSeverity, BugStatus } from '@prisma/client';

describe('ProjectsService & Certificates (T043, T044, T055, T056)', () => {
  it('T043 createProject checks duplicate repo (E-polyfactory-150) and getProjectById enforces PRIVATE access (E-polyfactory-307)', async () => {
    const projects: any[] = [
      { id: 'p1', name: 'Existing Project', githubRepoUrl: 'https://github.com/fpt/repo1', visibility: ProjectVisibility.PUBLIC, members: [] },
      { id: 'p2', name: 'Private Project', githubRepoUrl: 'https://github.com/fpt/repo2', visibility: ProjectVisibility.PRIVATE, members: [{ userId: 'member1' }] },
    ];

    const prismaMock: any = {
      project: {
        findFirst: async (args: any) => {
          return projects.find(
            (p) => p.name === args.where.OR[0].name || p.githubRepoUrl === args.where.OR[1].githubRepoUrl,
          );
        },
        create: async (args: any) => {
          const item = { id: `p_${projects.length + 1}`, ...args.data, members: [] };
          projects.push(item);
          return item;
        },
        findUnique: async (args: any) => projects.find((p) => p.id === args.where.id),
      },
      projectMember: {
        create: async (args: any) => args.data,
      },
    };

    const service = new ProjectsService(prismaMock);

    // 1. Trùng URL repo -> E-polyfactory-150
    await assert.rejects(
      async () => {
        await service.createProject('creator1', {
          name: 'New Project',
          githubRepoUrl: 'https://github.com/fpt/repo1',
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-150');
        return true;
      },
    );

    // 2. Dự án PRIVATE: người ngoài bị chặn E-polyfactory-307
    await assert.rejects(
      async () => {
        await service.getProjectById('stranger', UserRole.MEMBER, 'p2');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-307');
        return true;
      },
    );

    // 3. Dự án PRIVATE: thành viên dự án hoặc DEVELOPER xem bình thường
    const memberView = await service.getProjectById('member1', UserRole.MEMBER, 'p2');
    assert.strictEqual(memberView.id, 'p2');

    const devView = await service.getProjectById('dev_user', UserRole.DEVELOPER, 'p2');
    assert.strictEqual(devView.id, 'p2');
  });

  it('T044 applyToProject blocks TRAINEE (E-polyfactory-151) and duplicate application (E-polyfactory-152)', async () => {
    const users = [
      { id: 'trainee1', role: UserRole.TRAINEE },
      { id: 'member1', role: UserRole.MEMBER },
    ];

    const applications: any[] = [];
    const members: any[] = [];

    const prismaMock: any = {
      user: {
        findUnique: async (args: any) => users.find((u) => u.id === args.where.id),
      },
      projectMember: {
        findFirst: async (args: any) => members.find((m) => m.projectId === args.where.projectId && m.userId === args.where.userId),
        create: async (args: any) => {
          members.push(args.data);
          return args.data;
        },
      },
      projectApplication: {
        findFirst: async (args: any) => applications.find((a) => a.projectId === args.where.projectId && a.userId === args.where.userId && a.status === args.where.status),
        create: async (args: any) => {
          const item = { id: `app_${applications.length + 1}`, ...args.data };
          applications.push(item);
          return item;
        },
        findUnique: async (args: any) => applications.find((a) => a.id === args.where.id),
        update: async (args: any) => {
          const item = applications.find((a) => a.id === args.where.id);
          Object.assign(item, args.data);
          return item;
        },
      },
    };

    const service = new ProjectsService(prismaMock);

    // 1. TRAINEE đăng ký dự án -> E-polyfactory-151
    await assert.rejects(
      async () => {
        await service.applyToProject('trainee1', 'proj1', {
          className: 'SE1801',
          studentCode: 'SE18001',
          appliedPosition: Position.FRONTEND,
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-151');
        return true;
      },
    );

    // 2. MEMBER đăng ký lần đầu -> Thành công
    const app = await service.applyToProject('member1', 'proj1', {
      className: 'SE1801',
      studentCode: 'SE18002',
      appliedPosition: Position.TESTER,
    });
    assert.strictEqual(app.appliedPosition, Position.TESTER);

    // 3. MEMBER gửi đơn trùng khi đang chờ duyệt -> E-polyfactory-152
    await assert.rejects(
      async () => {
        await service.applyToProject('member1', 'proj1', {
          className: 'SE1801',
          studentCode: 'SE18002',
          appliedPosition: Position.BACKEND,
        });
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-152');
        return true;
      },
    );

    // 4. Duyệt đơn APPROVED -> tự động gán canTest = true cho TESTER
    await service.reviewApplication('lead1', app.id, {
      status: ApplicationStatus.APPROVED,
    });
    assert.strictEqual(members.length, 1);
    assert.strictEqual(members[0].canTest, true);
    assert.strictEqual(members[0].position, Position.TESTER);
  });

  it('T055 Release Gate blocks project completion with unresolved CRITICAL/HIGH bugs (E-polyfactory-305)', async () => {
    let project = { id: 'p_gate', status: 'ACTIVE', completionOverrideReason: null };
    const bugs: any[] = [
      { id: 'b1', projectId: 'p_gate', severity: BugSeverity.CRITICAL, status: BugStatus.OPEN },
    ];

    const prismaMock: any = {
      bug: {
        findMany: async (args: any) => {
          return bugs.filter((b) => b.projectId === args.where.projectId && b.status !== BugStatus.CLOSED);
        },
      },
      project: {
        update: async (args: any) => {
          project = { ...project, ...args.data };
          return project;
        },
      },
    };

    const service = new ProjectsService(prismaMock);

    // 1. Chặn hoàn thành khi còn bug CRITICAL -> E-polyfactory-305
    await assert.rejects(
      async () => {
        await service.completeProject('lead1', UserRole.TEAM_LEAD, 'p_gate');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-305');
        return true;
      },
    );

    // 2. MENTOR có lý do override >= 10 ký tự -> Hoàn thành thành công
    const completed = await service.completeProject(
      'mentor1',
      UserRole.MENTOR,
      'p_gate',
      'Đã chấp thuận dời fix sang sprint sau',
    );
    assert.strictEqual(completed.status, 'COMPLETED');
    assert.strictEqual(completed.completionOverrideReason, 'Đã chấp thuận dời fix sang sprint sau');
  });

  it('T056 ProjectCertificateService validates contribution rules and generates PF-CERT-YYYY-XXXX', async () => {
    const members = [
      { projectId: 'p1', userId: 'dev1', position: Position.FULLSTACK, isDeliverableVerified: false },
      { projectId: 'p1', userId: 'tester1', position: Position.TESTER, isDeliverableVerified: false },
      { projectId: 'p1', userId: 'uiux1', position: Position.UI_UX, isDeliverableVerified: true },
    ];

    const prismaMock: any = {
      projectMember: {
        findFirst: async (args: any) => members.find((m) => m.projectId === args.where.projectId && m.userId === args.where.userId),
      },
      projectActivity: {
        count: async (args: any) => {
          if (args.where.userId === 'dev1' && args.where.activityType === 'COMMIT') return 6; // >= 5 commits
          return 0;
        },
      },
      bug: {
        count: async () => 0,
      },
      testResult: {
        count: async () => 0,
      },
      projectCertificate: {
        upsert: async (args: any) => ({ id: 'cert_1', ...args.create }),
      },
    };

    const certService = new ProjectCertificateService(prismaMock);

    // 1. DEV1 đủ >= 5 commits -> Được cấp chứng chỉ
    const devCert = await certService.evaluateAndIssueCertificate('p1', 'dev1');
    assert.ok(devCert.certificateCode.startsWith('PF-CERT-'));
    assert.strictEqual(devCert.position, Position.FULLSTACK);

    // 2. TESTER1 chưa đủ 10 test case & chưa đủ 2 bugs -> E-polyfactory-154
    await assert.rejects(
      async () => {
        await certService.evaluateAndIssueCertificate('p1', 'tester1');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-154');
        return true;
      },
    );

    // 3. UI/UX có isDeliverableVerified = true -> Được cấp chứng chỉ
    const uiuxCert = await certService.evaluateAndIssueCertificate('p1', 'uiux1');
    assert.strictEqual(uiuxCert.position, Position.UI_UX);
  });
});
