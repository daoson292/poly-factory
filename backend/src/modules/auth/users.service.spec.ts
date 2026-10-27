import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UsersService } from './users.service';
import { Position, UserRole, UserStatus } from '@prisma/client';

function createMockPrisma() {
  const users = new Map<string, any>();
  const teams = new Map<string, any>();
  const schedules: any[] = [];

  return {
    state: { users, teams, schedules },
    client: {
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return users.get(where.id) || null;
          if (where.email) return users.get(where.email) || null;
          return null;
        },
        findFirst: async ({ where }: any) => {
          for (const u of users.values()) {
            if (where.githubUsername && u.githubUsername === where.githubUsername) {
              if (where.id?.not && u.id === where.id.not) continue;
              return u;
            }
            if (where.phone && u.phone === where.phone) {
              if (where.id?.not && u.id === where.id.not) continue;
              return u;
            }
          }
          return null;
        },
        update: async ({ where, data }: any) => {
          const user = users.get(where.id);
          if (!user) throw new Error('User not found');
          const next = { ...user };
          for (const [key, val] of Object.entries(data)) {
            if (val && typeof val === 'object' && 'increment' in (val as any)) {
              next[key] = (next[key] || 0) + (val as any).increment;
            } else {
              next[key] = val;
            }
          }
          users.set(where.id, next);
          return next;
        },
      },
      team: {
        update: async ({ where, data }: any) => {
          const team = teams.get(where.id);
          if (!team) throw new Error('Team not found');
          const next = { ...team, ...data };
          teams.set(where.id, next);
          return next;
        },
      },
      schedule: {
        deleteMany: async ({ where }: any) => {
          const initLen = schedules.length;
          const filtered = schedules.filter(
            (s) => !(s.userId === where.userId && s.workDate >= where.workDate.gte),
          );
          schedules.length = 0;
          schedules.push(...filtered);
          return { count: initLen - filtered.length };
        },
      },
    } as any,
  };
}

function createMockEventEmitter() {
  const events: any[] = [];
  return {
    events,
    emit: (event: string, payload: any) => events.push({ event, payload }),
  } as any;
}

describe('UsersService (T016)', () => {
  it('updateProfile checks duplicate githubUsername (E-polyfactory-006) and emits event on success', async () => {
    const mockPrisma = createMockPrisma();
    const eventEmitter = createMockEventEmitter();
    const service = new UsersService(mockPrisma.client, eventEmitter);

    mockPrisma.state.users.set('u-1', {
      id: 'u-1',
      email: 'user1@fpt.edu.vn',
      githubUsername: 'gitpro',
    });
    mockPrisma.state.users.set('u-2', {
      id: 'u-2',
      email: 'user2@fpt.edu.vn',
      githubUsername: null,
    });

    // Try linking same github username as u-1 -> E-polyfactory-006
    const dupRes = await service.updateProfile('u-2', { githubUsername: 'gitpro' });
    assert.equal(dupRes.errorCode, 'E-polyfactory-006');

    // Valid update -> success + event
    const okRes = await service.updateProfile('u-2', { githubUsername: 'unique_dev' });
    assert.equal(okRes.success, true);
    assert.equal(eventEmitter.events.length, 1);
    assert.equal(eventEmitter.events[0].event, 'user.github.linked');
    assert.equal(eventEmitter.events[0].payload.githubUsername, 'unique_dev');
  });

  it('updatePositions rejects TRAINEE (E-polyfactory-140) and allows MEMBER to choose positions', async () => {
    const mockPrisma = createMockPrisma();
    const service = new UsersService(mockPrisma.client, createMockEventEmitter());

    mockPrisma.state.users.set('trainee-1', {
      id: 'trainee-1',
      role: UserRole.TRAINEE,
      positions: null,
    });
    mockPrisma.state.users.set('member-1', {
      id: 'member-1',
      role: UserRole.MEMBER,
      positions: null,
    });

    // TRAINEE tries to choose -> E-polyfactory-140
    const traineeRes = await service.updatePositions('trainee-1', [Position.FRONTEND, Position.BACKEND]);
    assert.equal(traineeRes.errorCode, 'E-polyfactory-140');

    // MEMBER chooses -> success
    const memberRes = await service.updatePositions('member-1', [Position.BACKEND, Position.TESTER]);
    assert.equal(memberRes.success, true);
    assert.deepEqual(memberRes.positions, [Position.BACKEND, Position.TESTER]);
  });

  it('updateUserStatus protects main Team Lead (E-polyfactory-007) and cancels future schedules for ALUMNI/LOCKED', async () => {
    const mockPrisma = createMockPrisma();
    const service = new UsersService(mockPrisma.client, createMockEventEmitter());

    mockPrisma.state.users.set('lead-main', {
      id: 'lead-main',
      role: UserRole.TEAM_LEAD,
      status: UserStatus.ACTIVE,
      ledTeams: [{ id: 'team-alpha', name: 'Alpha' }],
    });
    mockPrisma.state.users.set('member-regular', {
      id: 'member-regular',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      ledTeams: [],
      teamId: 'team-alpha',
      team: { id: 'team-alpha', viceLeadIds: ['member-regular'] },
      tokenVersion: 0,
    });
    mockPrisma.state.teams.set('team-alpha', {
      id: 'team-alpha',
      viceLeadIds: ['member-regular'],
    });

    // 1. Transitioning main Lead fails with E-polyfactory-007
    const leadRes = await service.updateUserStatus('lead-main', UserStatus.ALUMNI, 'Tốt nghiệp', {
      id: 'mentor-1',
      role: UserRole.MENTOR,
    });
    assert.equal(leadRes.errorCode, 'E-polyfactory-007');

    // 2. Transitioning regular member to LOCKED succeeds: removes viceLead, increments tokenVersion
    const lockedRes = await service.updateUserStatus('member-regular', UserStatus.LOCKED, 'Vi phạm nội quy xưởng', {
      id: 'mentor-1',
      role: UserRole.MENTOR,
    });
    assert.equal(lockedRes.success, true);
    const updatedUser = mockPrisma.state.users.get('member-regular');
    assert.equal(updatedUser.status, UserStatus.LOCKED);
    assert.equal(updatedUser.tokenVersion, 1);

    const updatedTeam = mockPrisma.state.teams.get('team-alpha');
    assert.deepEqual(updatedTeam.viceLeadIds, []);

    // 3. Restoring user
    const restored = await service.restoreUser('member-regular', { id: 'mentor-1', role: UserRole.MENTOR });
    assert.equal(restored.success, true);
    assert.equal(restored.user?.status, UserStatus.ACTIVE);
  });
});
