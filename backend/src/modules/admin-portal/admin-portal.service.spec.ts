import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { AdminPortalService } from './admin-portal.service';
import * as bcrypt from 'bcrypt';

describe('AdminPortalService (T036 & T037)', () => {
  it('T036 login validates credentials (E-polyfactory-250) and active status (E-polyfactory-251)', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const mockAdmins = [
      { id: 'a1', username: 'active_admin', passwordHash: hash, isActive: true, adminRole: 'ADMIN', fullName: 'Admin One' },
      { id: 'a2', username: 'inactive_admin', passwordHash: hash, isActive: false, adminRole: 'ADMIN', fullName: 'Admin Two' },
    ];

    const prismaMock: any = {
      adminAccount: {
        findUnique: async (args: any) => mockAdmins.find((a) => a.username === args.where.username),
      },
    };

    const jwtMock: any = {
      sign: (payload: any) => `token_for_${payload.username}`,
    };

    const configMock: any = {
      get: (key: string, def: any) => def,
    };

    const service = new AdminPortalService(prismaMock, jwtMock, configMock);

    // 1. Username not found -> E-polyfactory-250
    await assert.rejects(
      async () => {
        await service.login('unknown_user', 'any_pass');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-250');
        return true;
      },
    );

    // 2. Password mismatch -> E-polyfactory-250
    await assert.rejects(
      async () => {
        await service.login('active_admin', 'wrong_pass');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-250');
        return true;
      },
    );

    // 3. Inactive admin -> E-polyfactory-251
    await assert.rejects(
      async () => {
        await service.login('inactive_admin', 'secret123');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-251');
        return true;
      },
    );

    // 4. Success -> returns accessToken & admin object
    const res = await service.login('active_admin', 'secret123');
    assert.strictEqual(res.accessToken, 'token_for_active_admin');
    assert.strictEqual(res.admin.adminRole, 'ADMIN');
  });

  it('T036 adjustUserExp requires >= 10 chars reason (E-polyfactory-252) and records AuditLog', async () => {
    let userState = {
      id: 'u1',
      currentExp: 50,
      totalExpEarned: 100,
    };

    let createdExpTx: any = null;
    let createdAuditLog: any = null;

    const prismaMock: any = {
      user: {
        findUnique: async () => ({ ...userState }),
        update: async (args: any) => {
          userState = { ...userState, ...args.data };
          return userState;
        },
      },
      expTransaction: {
        create: async (args: any) => {
          createdExpTx = args.data;
          return { id: 'tx_1', ...args.data };
        },
      },
      auditLog: {
        create: async (args: any) => {
          createdAuditLog = args.data;
          return { id: 'audit_1', ...args.data };
        },
      },
    };

    const service = new AdminPortalService(prismaMock, {} as any, {} as any);

    // 1. Lý do ngắn < 10 ký tự -> E-polyfactory-252
    await assert.rejects(
      async () => {
        await service.adjustUserExp('admin_root', 'u1', 20, 'Ngắn');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-252');
        return true;
      },
    );

    // 2. Lý do hợp lệ >= 10 ký tự
    const result = await service.adjustUserExp('admin_root', 'u1', 30, 'Thưởng hỗ trợ hội thảo Workshop');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.oldExp, 50);
    assert.strictEqual(result.newExp, 80);

    // Kiểm tra ExpTransaction
    assert.strictEqual(createdExpTx.amount, 30);
    assert.strictEqual(createdExpTx.balanceAfter, 80);

    // Kiểm tra AuditLog bất biến
    assert.strictEqual(createdAuditLog.tableName, 'users');
    assert.strictEqual(createdAuditLog.action, 'UPDATE_EXP');
    assert.strictEqual(createdAuditLog.actorUsername, 'admin_root');
    assert.strictEqual(createdAuditLog.oldValues.currentExp, 50);
    assert.strictEqual(createdAuditLog.newValues.currentExp, 80);
  });

  it('T037 getHardwareMetrics returns valid CPU and Memory metrics', async () => {
    const service = new AdminPortalService({} as any, {} as any, {} as any);
    const metrics = await service.getHardwareMetrics();

    assert.ok(typeof metrics.uptimeSeconds === 'number');
    assert.ok(metrics.memory.totalMB > 0);
    assert.ok(metrics.memory.usedMB >= 0);
    assert.ok(metrics.memory.usagePercentage >= 0 && metrics.memory.usagePercentage <= 100);
    assert.ok(metrics.cpu.cores > 0);
  });
});
