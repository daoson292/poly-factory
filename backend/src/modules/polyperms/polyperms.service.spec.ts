import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { PolyPermsService } from './polyperms.service';
import { UserRole, UserStatus } from '@prisma/client';

function createMockPrisma() {
  const users = new Map<string, any>();
  const teams = new Map<string, any>();
  const userPerms = new Map<string, any[]>();
  const rolePerms: any[] = [];
  const nodes: any[] = [];

  return {
    state: { users, teams, userPerms, rolePerms, nodes },
    client: {
      user: {
        findUnique: async ({ where }: any) => {
          const u = users.get(where.id);
          if (!u) return null;
          const up = userPerms.get(where.id) || [];
          const t = u.teamId ? teams.get(u.teamId) : null;
          return {
            ...u,
            team: t,
            userPermissions: up,
            groupMappings: u.groupMappings || [],
          };
        },
      },
      rolePermission: {
        findMany: async ({ where }: any) => {
          return rolePerms.filter(
            (rp) =>
              where.roleOrGroup.in.includes(rp.roleOrGroup) &&
              rp.nodeId === where.nodeId &&
              rp.isAllowed === where.isAllowed,
          );
        },
      },
      userPermission: {
        findFirst: async ({ where }: any) => {
          const upList = userPerms.get(where.userId) || [];
          return upList.find((p) => p.nodeId === where.nodeId) || null;
        },
        create: async ({ data }: any) => {
          const upList = userPerms.get(data.userId) || [];
          const record = { id: `up-${Date.now()}-${Math.random()}`, ...data };
          upList.push(record);
          userPerms.set(data.userId, upList);
          return record;
        },
        update: async ({ where, data }: any) => {
          for (const [uid, list] of userPerms.entries()) {
            const idx = list.findIndex((p) => p.id === where.id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...data };
              return list[idx];
            }
          }
          throw new Error('UserPermission not found');
        },
        deleteMany: async ({ where }: any) => {
          const list = userPerms.get(where.userId) || [];
          const filtered = list.filter((p) => !where.nodeId.in.includes(p.nodeId));
          userPerms.set(where.userId, filtered);
          return { count: list.length - filtered.length };
        },
      },
      permissionNode: {
        findMany: async () => nodes,
      },
    } as any,
  };
}

describe('PolyPermsService (T017 & T018)', () => {
  it('Step 0: LOCKED status rejects immediately and ALUMNI allows only *.view', async () => {
    const mockPrisma = createMockPrisma();
    const service = new PolyPermsService(mockPrisma.client);

    mockPrisma.state.users.set('u-locked', {
      id: 'u-locked',
      role: UserRole.DEVELOPER,
      status: UserStatus.LOCKED,
    });
    mockPrisma.state.users.set('u-alumni', {
      id: 'u-alumni',
      role: UserRole.MEMBER,
      status: UserStatus.ALUMNI,
    });

    const lockedRes = await service.resolvePermission('u-locked', 'member.view');
    assert.equal(lockedRes.allowed, false);
    assert.equal(lockedRes.source, 'STATUS_LOCKED');

    const alumniView = await service.resolvePermission('u-alumni', 'schedule.view');
    assert.equal(alumniView.allowed, true);
    assert.equal(alumniView.source, 'ALUMNI_VIEW');

    const alumniWrite = await service.resolvePermission('u-alumni', 'schedule.register');
    assert.equal(alumniWrite.allowed, false);
    assert.equal(alumniWrite.source, 'ALUMNI_READONLY');
  });

  it('Step 1: Negative personal exception (-node) overrides role permission', async () => {
    const mockPrisma = createMockPrisma();
    const service = new PolyPermsService(mockPrisma.client);

    mockPrisma.state.users.set('u-member', {
      id: 'u-member',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
    });
    mockPrisma.state.rolePerms.push({
      roleOrGroup: 'MEMBER',
      nodeId: 'testing.bug.report',
      isAllowed: true,
    });

    // Without override -> allowed via PRIMARY_ROLE
    const initial = await service.resolvePermission('u-member', 'testing.bug.report');
    assert.equal(initial.allowed, true);
    assert.equal(initial.source, 'PRIMARY_ROLE');

    // Add negative personal override
    mockPrisma.state.userPerms.set('u-member', [
      { id: 'up-neg', userId: 'u-member', nodeId: 'testing.bug.report', isAllowed: false, expiresAt: null },
    ]);

    const overridden = await service.resolvePermission('u-member', 'testing.bug.report');
    assert.equal(overridden.allowed, false);
    assert.equal(overridden.source, 'PERSONAL_DENIAL');
  });

  it('Step 2: Vice-Lead permissions apply within own team only', async () => {
    const mockPrisma = createMockPrisma();
    const service = new PolyPermsService(mockPrisma.client);

    mockPrisma.state.teams.set('team-omega', {
      id: 'team-omega',
      viceLeadIds: ['u-vice'],
      viceLeadPermissions: { 'attendance.qr.create': true },
    });
    mockPrisma.state.users.set('u-vice', {
      id: 'u-vice',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      teamId: 'team-omega',
    });

    // Allowed within team-omega
    const teamRes = await service.resolvePermission('u-vice', 'attendance.qr.create', 'team-omega');
    assert.equal(teamRes.allowed, true);
    assert.equal(teamRes.source, 'VICE_LEAD');

    // Denied for other team
    const otherTeamRes = await service.resolvePermission('u-vice', 'attendance.qr.create', 'team-other');
    assert.equal(otherTeamRes.allowed, false);
  });

  it('Step 5: Role hierarchy inheritance: DEVELOPER inherits MENTOR + system.config.manage', async () => {
    const mockPrisma = createMockPrisma();
    const service = new PolyPermsService(mockPrisma.client);

    mockPrisma.state.users.set('u-dev', {
      id: 'u-dev',
      role: UserRole.DEVELOPER,
      status: UserStatus.ACTIVE,
    });
    mockPrisma.state.rolePerms.push(
      { roleOrGroup: 'DEFAULT', nodeId: 'member.view', isAllowed: true },
      { roleOrGroup: 'TEAM_LEAD', nodeId: 'attendance.qr.create', isAllowed: true },
      { roleOrGroup: 'MENTOR', nodeId: 'reward.grant', isAllowed: true },
      { roleOrGroup: 'DEVELOPER', nodeId: 'system.config.manage', isAllowed: true },
    );

    // DEVELOPER can access DEFAULT, TEAM_LEAD, MENTOR, and DEVELOPER nodes
    const devView = await service.resolvePermission('u-dev', 'member.view');
    assert.equal(devView.allowed, true);

    const devLead = await service.resolvePermission('u-dev', 'attendance.qr.create');
    assert.equal(devLead.allowed, true);

    const devMentor = await service.resolvePermission('u-dev', 'reward.grant');
    assert.equal(devMentor.allowed, true);

    const devSys = await service.resolvePermission('u-dev', 'system.config.manage');
    assert.equal(devSys.allowed, true);
  });

  it('T018: delegateShiftToday delegates shift nodes until 23:59:59 and revokeShiftDelegation removes them', async () => {
    const mockPrisma = createMockPrisma();
    const service = new PolyPermsService(mockPrisma.client);

    mockPrisma.state.users.set('target-member', {
      id: 'target-member',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      teamId: 'team-alpha',
    });

    // Delegate shift today
    const res = await service.delegateShiftToday(
      { id: 'lead-1', role: UserRole.TEAM_LEAD, teamId: 'team-alpha' },
      'target-member',
    );
    assert.equal(res.success, true);
    assert.deepEqual(res.delegatedNodes, ['attendance.qr.create', 'attendance.manual.override']);

    // Now target-member has personal allow for attendance.qr.create
    const checkPerm = await service.resolvePermission('target-member', 'attendance.qr.create');
    assert.equal(checkPerm.allowed, true);
    assert.equal(checkPerm.source, 'PERSONAL_ALLOW');

    // Revoke
    const revokeRes = await service.revokeShiftDelegation(
      { id: 'lead-1', role: UserRole.TEAM_LEAD, teamId: 'team-alpha' },
      'target-member',
    );
    assert.equal(revokeRes.success, true);

    const checkRevoked = await service.resolvePermission('target-member', 'attendance.qr.create');
    assert.equal(checkRevoked.allowed, false);
  });
});
