import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { TeamsService } from './teams.service';
import { UserRole } from '@prisma/client';

function createMockPrisma() {
  const teams = new Map<string, any>();
  const users = new Map<string, any>();

  return {
    state: { teams, users },
    client: {
      team: {
        findUnique: async ({ where }: any) => {
          if (where.name) {
            for (const t of teams.values()) {
              if (t.name.toLowerCase() === where.name.toLowerCase()) return t;
            }
            return null;
          }
          if (where.id) return teams.get(where.id) || null;
          return null;
        },
        create: async ({ data }: any) => {
          const team = { id: `team-${Date.now()}-${Math.random()}`, ...data };
          teams.set(team.id, team);
          return team;
        },
        update: async ({ where, data }: any) => {
          const t = teams.get(where.id);
          if (!t) throw new Error('Team not found');
          const next = { ...t, ...data };
          teams.set(where.id, next);
          return next;
        },
      },
      user: {
        findUnique: async ({ where }: any) => {
          const u = users.get(where.id);
          if (!u) return null;
          const t = u.teamId ? teams.get(u.teamId) : null;
          return { ...u, team: t };
        },
        update: async ({ where, data }: any) => {
          const u = users.get(where.id);
          if (!u) throw new Error('User not found');
          const next = { ...u, ...data };
          users.set(where.id, next);
          return next;
        },
      },
    } as any,
  };
}

describe('TeamsService (T020)', () => {
  it('createTeam rejects duplicate team name with E-polyfactory-040', async () => {
    const mockPrisma = createMockPrisma();
    const service = new TeamsService(mockPrisma.client);

    mockPrisma.state.teams.set('team-alpha', { id: 'team-alpha', name: 'Alpha Team' });

    const dupRes = await service.createTeam({ name: 'Alpha Team' });
    assert.equal(dupRes.errorCode, 'E-polyfactory-040');

    const okRes = await service.createTeam({ name: 'Beta Team' });
    assert.equal(okRes.success, true);
  });

  it('configureViceLead validates MEMBER role, same team (E-polyfactory-041) and max 2 vice leads (E-polyfactory-042)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new TeamsService(mockPrisma.client);

    mockPrisma.state.teams.set('team-a', { id: 'team-a', name: 'Team A', viceLeadIds: [] });
    mockPrisma.state.users.set('trainee-a', { id: 'trainee-a', role: UserRole.TRAINEE, teamId: 'team-a', fullName: 'Trainee A' });
    mockPrisma.state.users.set('member-b', { id: 'member-b', role: UserRole.MEMBER, teamId: 'team-b', fullName: 'Member B' });
    mockPrisma.state.users.set('member-a1', { id: 'member-a1', role: UserRole.MEMBER, teamId: 'team-a', fullName: 'Member A1' });
    mockPrisma.state.users.set('member-a2', { id: 'member-a2', role: UserRole.MEMBER, teamId: 'team-a', fullName: 'Member A2' });
    mockPrisma.state.users.set('member-a3', { id: 'member-a3', role: UserRole.MEMBER, teamId: 'team-a', fullName: 'Member A3' });

    // 1. More than 2 vice leads -> E-polyfactory-042
    const overLimitRes = await service.configureViceLead('team-a', ['member-a1', 'member-a2', 'member-a3']);
    assert.equal(overLimitRes.errorCode, 'E-polyfactory-042');

    // 2. Trainee -> E-polyfactory-041
    const traineeRes = await service.configureViceLead('team-a', ['trainee-a']);
    assert.equal(traineeRes.errorCode, 'E-polyfactory-041');

    // 3. Member from other team -> E-polyfactory-041
    const otherTeamRes = await service.configureViceLead('team-a', ['member-b']);
    assert.equal(otherTeamRes.errorCode, 'E-polyfactory-041');

    // 4. Valid 2 members -> success
    const okRes = await service.configureViceLead(
      'team-a',
      ['member-a1', 'member-a2'],
      { 'attendance.qr.create': true, 'schedule.assign': true },
    );
    assert.equal(okRes.success, true);
    assert.deepEqual(okRes.team.viceLeadIds, ['member-a1', 'member-a2']);
    assert.equal(okRes.team.viceLeadPermissions['attendance.qr.create'], true);
  });

  it('transferMember transfers user and removes them from old team viceLeadIds', async () => {
    const mockPrisma = createMockPrisma();
    const service = new TeamsService(mockPrisma.client);

    mockPrisma.state.teams.set('team-src', { id: 'team-src', name: 'Source Team', viceLeadIds: ['v-lead'] });
    mockPrisma.state.teams.set('team-dst', { id: 'team-dst', name: 'Dest Team', viceLeadIds: [] });
    mockPrisma.state.users.set('v-lead', { id: 'v-lead', role: UserRole.MEMBER, teamId: 'team-src' });

    const res = await service.transferMember('v-lead', 'team-dst');
    assert.equal(res.success, true);
    assert.equal(res.user?.teamId, 'team-dst');

    const srcTeam = mockPrisma.state.teams.get('team-src');
    assert.deepEqual(srcTeam.viceLeadIds, []);
  });
});
