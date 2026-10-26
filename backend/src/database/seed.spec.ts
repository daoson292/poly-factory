import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  DEFAULT_BADGE_TAGS_V220,
  DEFAULT_ROLE_PERMISSION_MAP,
  PERMISSION_NODES_V220,
  TRAINING_LEVELS_V220,
  seedDatabase,
} from './seed';
import { PrismaService, buildPooledDatabaseUrl } from './prisma.service';

function createInMemoryPrismaMock() {
  const nodes = new Map<string, any>();
  const rolePerms = new Map<string, any>();
  const levels = new Map<number, any>();
  const tags = new Map<string, any>();
  const users = new Map<string, any>();
  const rooms: any[] = [];
  const admins = new Map<string, any>();

  return {
    state: { nodes, rolePerms, levels, tags, users, rooms, admins },
    client: {
      permissionNode: {
        upsert: async ({ where, update, create }: any) => {
          const existing = nodes.get(where.nodeId);
          const next = existing ? { ...existing, ...update } : { ...create };
          nodes.set(where.nodeId, next);
          return next;
        },
      },
      rolePermission: {
        upsert: async ({ where, update, create }: any) => {
          const key = `${where.roleOrGroup_nodeId.roleOrGroup}:${where.roleOrGroup_nodeId.nodeId}`;
          const existing = rolePerms.get(key);
          const next = existing ? { ...existing, ...update } : { ...create };
          rolePerms.set(key, next);
          return next;
        },
      },
      trainingLevel: {
        upsert: async ({ where, update, create }: any) => {
          const existing = levels.get(where.orderIndex);
          const next = existing ? { ...existing, ...update } : { ...create };
          levels.set(where.orderIndex, next);
          return next;
        },
      },
      badgeTag: {
        upsert: async ({ where, update, create }: any) => {
          const existing = tags.get(where.name);
          const next = existing ? { ...existing, ...update } : { ...create };
          tags.set(where.name, next);
          return next;
        },
      },
      user: {
        upsert: async ({ where, update, create }: any) => {
          const existing = users.get(where.email);
          const next = existing
            ? { ...existing, ...update }
            : { id: '00000000-0000-0000-0000-000000000001', ...create };
          users.set(where.email, next);
          return next;
        },
      },
      roomConfig: {
        findFirst: async ({ where }: any) =>
          rooms.find((r) => r.currentRoom === where.currentRoom) ?? null,
        create: async ({ data }: any) => {
          const rec = { id: '00000000-0000-0000-0000-000000000002', ...data };
          rooms.push(rec);
          return rec;
        },
      },
      adminAccount: {
        upsert: async ({ where, update, create }: any) => {
          const existing = admins.get(where.username);
          const next = existing ? { ...existing, ...update } : { ...create };
          admins.set(where.username, next);
          return next;
        },
      },
    } as any,
  };
}

describe('PolyFactory v2.2.0 Database Seed & Connection Pool (T011-T013)', () => {
  it('defines exactly 37 permission nodes matching SRS Section 7.2', () => {
    assert.equal(PERMISSION_NODES_V220.length, 37);
    const nodeIds = new Set(PERMISSION_NODES_V220.map((n) => n.nodeId));
    assert.equal(nodeIds.size, 37);
    assert.ok(nodeIds.has('member.view'));
    assert.ok(nodeIds.has('attendance.qr.delegate'));
    assert.ok(nodeIds.has('testing.suite.manage'));
    assert.ok(nodeIds.has('testing.run.create'));
    assert.ok(nodeIds.has('testing.run.execute'));
    assert.ok(nodeIds.has('testing.run.close'));
    assert.ok(nodeIds.has('testing.bug.report'));
    assert.ok(nodeIds.has('testing.bug.resolve'));
    assert.ok(nodeIds.has('testing.bug.verify'));
    assert.ok(nodeIds.has('testing.bug.triage'));
    assert.ok(nodeIds.has('system.config.manage'));
  });

  it('defines 3 training levels (with Level 3 as graduation level) and 6 badge tags (3 level + 3 curse)', () => {
    assert.equal(TRAINING_LEVELS_V220.length, 3);
    assert.equal(TRAINING_LEVELS_V220[2].isGraduationLevel, true);

    assert.equal(DEFAULT_BADGE_TAGS_V220.length, 6);
    const curseTags = DEFAULT_BADGE_TAGS_V220.filter((t) => t.isCurse);
    const levelTags = DEFAULT_BADGE_TAGS_V220.filter((t) => !t.isCurse);
    assert.equal(curseTags.length, 3);
    assert.equal(levelTags.length, 3);
  });

  it('executes seedDatabase idempotently across multiple runs', async () => {
    const mock = createInMemoryPrismaMock();

    const firstRun = await seedDatabase(mock.client);
    const secondRun = await seedDatabase(mock.client);

    assert.deepEqual(firstRun, secondRun);
    assert.equal(mock.state.nodes.size, 37);
    assert.equal(mock.state.levels.size, 3);
    assert.equal(mock.state.tags.size, 6);
    assert.equal(mock.state.rooms.length, 1);
    assert.equal(mock.state.rooms[0].currentRoom, 'P407');
    assert.equal(mock.state.admins.get('admin_sondao')?.adminRole, 'SUPER_ADMIN');
    assert.equal(mock.state.users.get('developer@fpt.edu.vn')?.role, 'DEVELOPER');

    const totalRolePermsExpected = Object.values(DEFAULT_ROLE_PERMISSION_MAP).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    assert.equal(mock.state.rolePerms.size, totalRolePermsExpected);
  });

  it('appends connection_limit=18 to DATABASE_URL when not already present (NFR-polyfactory-030)', () => {
    assert.equal(
      buildPooledDatabaseUrl('postgresql://user:pass@localhost:5432/polyfactory'),
      'postgresql://user:pass@localhost:5432/polyfactory?connection_limit=18',
    );
    assert.equal(
      buildPooledDatabaseUrl('postgresql://user:pass@localhost:5432/polyfactory?schema=public'),
      'postgresql://user:pass@localhost:5432/polyfactory?schema=public&connection_limit=18',
    );
    assert.equal(
      buildPooledDatabaseUrl('postgresql://user:pass@localhost:5432/polyfactory?connection_limit=15'),
      'postgresql://user:pass@localhost:5432/polyfactory?connection_limit=15',
    );
    assert.equal(PrismaService.DEFAULT_CONNECTION_LIMIT, 18);
  });
});
