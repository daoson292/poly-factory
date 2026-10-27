import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '@prisma/client';

function createMockPrisma() {
  const users = new Map<string, any>();
  const levels = new Map<number, any>();

  // Seed default Level 1
  levels.set(1, { id: 'lvl-1-id', name: 'Level 1', orderIndex: 1 });

  return {
    state: { users, levels },
    client: {
      user: {
        findUnique: async ({ where }: any) => {
          if (where.email) return users.get(where.email.toLowerCase()) || null;
          if (where.id) {
            for (const u of users.values()) {
              if (u.id === where.id) return u;
            }
            return null;
          }
          if (where.phone) {
            for (const u of users.values()) {
              if (u.phone === where.phone) return u;
            }
            return null;
          }
          return null;
        },
        findFirst: async ({ where }: any) => {
          for (const u of users.values()) {
            if (where.githubUsername && u.githubUsername === where.githubUsername) {
              if (where.id?.not && u.id === where.id.not) continue;
              return u;
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const user = {
            id: `user-${Date.now()}-${Math.random()}`,
            tokenVersion: 0,
            currentExp: 0,
            currentLevel: 1,
            positions: null,
            ...data,
          };
          users.set(user.email.toLowerCase(), user);
          return user;
        },
        update: async ({ where, data }: any) => {
          const existing = await (async () => {
            if (where.id) {
              for (const u of users.values()) {
                if (u.id === where.id) return u;
              }
            }
            if (where.email) return users.get(where.email.toLowerCase());
            return null;
          })();
          if (!existing) throw new Error('User not found');
          const next = { ...existing };
          for (const [key, val] of Object.entries(data)) {
            if (val && typeof val === 'object' && 'increment' in (val as any)) {
              next[key] = (next[key] || 0) + (val as any).increment;
            } else {
              next[key] = val;
            }
          }
          users.set(next.email.toLowerCase(), next);
          return next;
        },
      },
      trainingLevel: {
        findFirst: async ({ where }: any) => {
          if (where.orderIndex) return levels.get(where.orderIndex) || null;
          return null;
        },
      },
    } as any,
  };
}

function createMockJwt() {
  return {
    sign: (payload: any) => `mock_token_${JSON.stringify(payload)}`,
    verify: (token: string) => {
      const json = token.replace('mock_token_', '');
      return JSON.parse(json);
    },
  } as any;
}

function createMockEventEmitter() {
  const events: any[] = [];
  return {
    events,
    emit: (event: string, payload: any) => events.push({ event, payload }),
  } as any;
}

describe('AuthService (T014 & T015)', () => {
  it('Branch 1: returns E-polyfactory-001 when email not in whitelist', async () => {
    const mockPrisma = createMockPrisma();
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const result = await service.validateGoogleUser({
      email: 'outsider@gmail.com',
      fullName: 'Outsider',
    });

    assert.equal(result.success, false);
    assert.equal(result.errorCode, 'E-polyfactory-001');
  });

  it('Branch 2: returns E-polyfactory-002 when user is LOCKED', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.users.set('locked@fpt.edu.vn', {
      id: 'u-locked',
      email: 'locked@fpt.edu.vn',
      fullName: 'Locked User',
      status: UserStatus.LOCKED,
      role: UserRole.MEMBER,
      tokenVersion: 1,
    });
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const result = await service.validateGoogleUser({
      email: 'locked@fpt.edu.vn',
      fullName: 'Locked User',
    });

    assert.equal(result.success, false);
    assert.equal(result.errorCode, 'E-polyfactory-002');
  });

  it('Branch 3: activates PENDING_ACTIVATION user to ACTIVE and auto assigns Level 1 for TRAINEE', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.users.set('newbie@fpt.edu.vn', {
      id: 'u-newbie',
      email: 'newbie@fpt.edu.vn',
      fullName: 'Newbie Trainee',
      status: UserStatus.PENDING_ACTIVATION,
      role: UserRole.TRAINEE,
      trainingLevelId: null,
      tokenVersion: 0,
      currentExp: 0,
      currentLevel: 1,
    });
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const result = await service.validateGoogleUser({
      email: 'newbie@fpt.edu.vn',
      fullName: 'Newbie Trainee Updated',
      avatarUrl: 'https://avatar.url/newbie.png',
    });

    assert.equal(result.success, true);
    assert.equal(result.user?.status, UserStatus.ACTIVE);
    assert.equal(result.user?.trainingLevelId, 'lvl-1-id');
    assert.equal(result.user?.readOnly, false);
    assert.ok(result.accessToken);
  });

  it('Branch 4: allows ACTIVE user to log in normally with valid token', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.users.set('active@fpt.edu.vn', {
      id: 'u-active',
      email: 'active@fpt.edu.vn',
      fullName: 'Active Member',
      status: UserStatus.ACTIVE,
      role: UserRole.MEMBER,
      tokenVersion: 0,
      currentExp: 100,
      currentLevel: 3,
    });
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const result = await service.validateGoogleUser({
      email: 'active@fpt.edu.vn',
      fullName: 'Active Member',
    });

    assert.equal(result.success, true);
    assert.equal(result.user?.status, UserStatus.ACTIVE);
    assert.equal(result.user?.readOnly, false);
  });

  it('Branch 5: allows ALUMNI to log in with readOnly=true flag', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.users.set('alumni@gmail.com', {
      id: 'u-alumni',
      email: 'alumni@gmail.com',
      fullName: 'Alumni Dev',
      status: UserStatus.ALUMNI,
      role: UserRole.DEVELOPER,
      tokenVersion: 2,
      currentExp: 5000,
      currentLevel: 42,
    });
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const result = await service.validateGoogleUser({
      email: 'alumni@gmail.com',
      fullName: 'Alumni Dev',
    });

    assert.equal(result.success, true);
    assert.equal(result.user?.status, UserStatus.ALUMNI);
    assert.equal(result.user?.readOnly, true);
  });

  it('logoutAllDevices increments tokenVersion', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.state.users.set('user@fpt.edu.vn', {
      id: 'u-1',
      email: 'user@fpt.edu.vn',
      tokenVersion: 0,
    });
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const result = await service.logoutAllDevices('u-1');
    assert.equal(result.success, true);
    const updated = await mockPrisma.client.user.findUnique({ where: { id: 'u-1' } });
    assert.equal(updated.tokenVersion, 1);
  });

  it('addMemberToWhitelist enforces email regex, duplicate checks, and team lead constraints', async () => {
    const mockPrisma = createMockPrisma();
    const eventEmitter = createMockEventEmitter();
    const service = new AuthService(mockPrisma.client, createMockJwt(), eventEmitter);

    // 1. Invalid email regex -> E-polyfactory-003
    const res1 = await service.addMemberToWhitelist(
      { email: 'bademail@yahoo.com', fullName: 'Bad' },
      { id: 'admin-1', role: UserRole.MENTOR },
    );
    assert.equal(res1.errorCode, 'E-polyfactory-003');

    // 2. Add valid member -> success + event emitted
    const res2 = await service.addMemberToWhitelist(
      { email: 'good@fpt.edu.vn', fullName: 'Good Member', phone: '0901234567' },
      { id: 'admin-1', role: UserRole.MENTOR },
    );
    assert.equal(res2.success, true);
    assert.equal(eventEmitter.events.length, 1);
    assert.equal(eventEmitter.events[0].event, 'member.whitelisted');

    // 3. Duplicate email -> E-polyfactory-004
    const res3 = await service.addMemberToWhitelist(
      { email: 'good@fpt.edu.vn', fullName: 'Duplicate' },
      { id: 'admin-1', role: UserRole.MENTOR },
    );
    assert.equal(res3.errorCode, 'E-polyfactory-004');

    // 4. Duplicate phone -> E-polyfactory-005
    const res4 = await service.addMemberToWhitelist(
      { email: 'another@gmail.com', fullName: 'Another', phone: '0901234567' },
      { id: 'admin-1', role: UserRole.MENTOR },
    );
    assert.equal(res4.errorCode, 'E-polyfactory-005');

    // 5. Team lead cannot add to other team or grant higher than MEMBER
    const res5 = await service.addMemberToWhitelist(
      { email: 'trainee@gmail.com', fullName: 'Trainee', teamId: 'team-b', role: UserRole.MENTOR },
      { id: 'lead-1', role: UserRole.TEAM_LEAD, teamId: 'team-a' },
    );
    assert.equal(res5.errorCode, 'E-polyfactory-040');
  });

  it('previewWhitelistImport and confirmWhitelistImport process batches correctly', async () => {
    const mockPrisma = createMockPrisma();
    const service = new AuthService(mockPrisma.client, createMockJwt(), createMockEventEmitter());

    const preview = await service.previewWhitelistImport(
      [
        { email: 'valid1@fpt.edu.vn', fullName: 'Member 1' },
        { email: 'valid2@gmail.com', fullName: 'Member 2', phone: '0911222333' },
        { email: 'invalid@yahoo.com', fullName: 'Member 3' },
        { email: 'valid1@fpt.edu.vn', fullName: 'Member 1 Duplicate' },
      ],
      { id: 'admin-1', role: UserRole.MENTOR },
    );

    assert.equal(preview.totalCount, 4);
    assert.equal(preview.validCount, 2);
    assert.equal(preview.invalidCount, 2);

    const confirm = await service.confirmWhitelistImport(preview.validRows, {
      id: 'admin-1',
      role: UserRole.MENTOR,
    });
    assert.equal(confirm.success, true);
    assert.equal(confirm.importedCount, 2);
  });
});
