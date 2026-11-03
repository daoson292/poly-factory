import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProjectRoleGuard } from './project-role.guard';
import { ProjectVisibility, UserRole } from '@prisma/client';

function createMockReflector(options: any = null) {
  return {
    getAllAndOverride: () => options,
  } as any;
}

function createMockPrisma() {
  const projects = new Map<string, any>();

  return {
    state: { projects },
    client: {
      project: {
        findUnique: async ({ where, include }: any) => {
          const p = projects.get(where.id);
          if (!p) return null;
          let filteredMembers = p.members || [];
          if (include?.members?.where?.userId) {
            filteredMembers = filteredMembers.filter(
              (m: any) => m.userId === include.members.where.userId,
            );
          }
          return { ...p, members: filteredMembers };
        },
      },
    } as any,
  };
}

function createMockContext(user: any, params: any = {}, body: any = {}) {
  const req = { user, params, body };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as any;
}

describe('ProjectRoleGuard (T019)', () => {
  it('DEVELOPER and MENTOR bypass all project checks directly', async () => {
    const mockPrisma = createMockPrisma();
    const guard = new ProjectRoleGuard(createMockReflector({ requireTester: true }), mockPrisma.client);

    const devContext = createMockContext({ id: 'u-dev', role: UserRole.DEVELOPER }, { projectId: 'p-1' });
    const mentorContext = createMockContext({ id: 'u-mentor', role: UserRole.MENTOR }, { projectId: 'p-1' });

    assert.equal(await guard.canActivate(devContext), true);
    assert.equal(await guard.canActivate(mentorContext), true);
  });

  it('rejects non-members accessing PRIVATE project with E-polyfactory-307', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.projects.set('p-private', {
      id: 'p-private',
      visibility: ProjectVisibility.PRIVATE,
      createdById: 'u-creator',
      members: [],
    });

    const guard = new ProjectRoleGuard(createMockReflector(), mockPrisma.client);
    const outsiderContext = createMockContext(
      { id: 'u-outsider', role: UserRole.MEMBER },
      { projectId: 'p-private' },
    );

    await assert.rejects(
      async () => guard.canActivate(outsiderContext),
      (err: any) => {
        assert.equal(err.response?.errorCode, 'E-polyfactory-307');
        return true;
      },
    );
  });

  it('requireTester rejects non-tester member with E-polyfactory-300 and allows TESTER or canTest=true', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.projects.set('p-1', {
      id: 'p-1',
      visibility: ProjectVisibility.PUBLIC,
      createdById: 'u-creator',
      members: [
        { userId: 'u-backend', position: 'BACKEND', canTest: false, isProjectLead: false },
        { userId: 'u-tester', position: 'TESTER', canTest: false, isProjectLead: false },
        { userId: 'u-dev-cantest', position: 'FRONTEND', canTest: true, isProjectLead: false },
      ],
    });

    const guard = new ProjectRoleGuard(createMockReflector({ requireTester: true }), mockPrisma.client);

    // Backend dev without canTest -> E-polyfactory-300
    const backendCtx = createMockContext(
      { id: 'u-backend', role: UserRole.MEMBER },
      { projectId: 'p-1' },
    );
    await assert.rejects(
      async () => guard.canActivate(backendCtx),
      (err: any) => {
        assert.equal(err.response?.errorCode, 'E-polyfactory-300');
        return true;
      },
    );

    // Tester -> allowed
    const testerCtx = createMockContext(
      { id: 'u-tester', role: UserRole.MEMBER },
      { projectId: 'p-1' },
    );
    assert.equal(await guard.canActivate(testerCtx), true);

    // Frontend dev with canTest=true -> allowed
    const canTestCtx = createMockContext(
      { id: 'u-dev-cantest', role: UserRole.MEMBER },
      { projectId: 'p-1' },
    );
    assert.equal(await guard.canActivate(canTestCtx), true);
  });

  it('requireProjectLead rejects regular member with E-polyfactory-304 and allows isProjectLead=true', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.projects.set('p-1', {
      id: 'p-1',
      visibility: ProjectVisibility.PUBLIC,
      createdById: 'u-creator',
      members: [
        { userId: 'u-member', position: 'TESTER', isProjectLead: false },
        { userId: 'u-lead', position: 'FULLSTACK', isProjectLead: true },
      ],
    });

    const guard = new ProjectRoleGuard(createMockReflector({ requireProjectLead: true }), mockPrisma.client);

    // Regular member -> E-polyfactory-304
    const memberCtx = createMockContext(
      { id: 'u-member', role: UserRole.MEMBER },
      { projectId: 'p-1' },
    );
    await assert.rejects(
      async () => guard.canActivate(memberCtx),
      (err: any) => {
        assert.equal(err.response?.errorCode, 'E-polyfactory-304');
        return true;
      },
    );

    // Lead -> allowed
    const leadCtx = createMockContext(
      { id: 'u-lead', role: UserRole.MEMBER },
      { projectId: 'p-1' },
    );
    assert.equal(await guard.canActivate(leadCtx), true);
  });
});
