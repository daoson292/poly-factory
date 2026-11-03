import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ZaloMiniAppService } from '../src/modules/zalo-miniapp/zalo-miniapp.service';
import { parseDeepLink, resolveDeepLinkRoute } from '../../zalo-miniapp/src/utils/deep-link';
import { UserRole, UserStatus } from '@prisma/client';

describe('Zalo Mini App E2E Integration Suite (T069)', () => {
  it('E2E Zalo Flow: Generate Code -> Link Account -> Auto Login -> Deep Link Routing', async () => {
    const users: any[] = [
      {
        id: 'usr_fpt_1',
        email: 'fpt_student@fpt.edu.vn',
        fullName: 'Zalo FPT Student',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        zaloUserId: null,
      },
    ];

    const jwtMock: any = {
      sign: (payload: any) => `jwt_token_zalo_${payload.sub}`,
    };

    const prismaMock: any = {
      user: {
        findUnique: async (args: any) => {
          if (args.where.id) return users.find((u) => u.id === args.where.id) || null;
          if (args.where.zaloUserId) return users.find((u) => u.zaloUserId === args.where.zaloUserId) || null;
          return null;
        },
        update: async (args: any) => {
          const u = users.find((x) => x.id === args.where.id);
          Object.assign(u, args.data);
          return u;
        },
      },
    };

    const service = new ZaloMiniAppService(prismaMock, jwtMock);

    // 1. Generate 6-digit linking code on Web (TTL 10 min)
    const codeResult = service.generateLinkCode('usr_fpt_1');
    assert.strictEqual(codeResult.code.length, 6);
    assert.strictEqual(codeResult.expiresInSeconds, 600);

    // 2. Link account with code on Zalo Mini App
    const linkResult = await service.verifyAndLinkZalo(codeResult.code, 'zalo_uid_test_123');
    assert.strictEqual(linkResult.success, true);
    assert.strictEqual(linkResult.user.zaloUserId, 'zalo_uid_test_123');
    assert.ok(linkResult.accessToken);

    // 3. Subsequent Auto-login via Zalo UID in < 0.5s
    const startTime = Date.now();
    const autoLoginResult = await service.autoLogin('zalo_uid_test_123');
    const elapsed = Date.now() - startTime;
    assert.strictEqual(autoLoginResult.linked, true);
    assert.strictEqual(autoLoginResult.user?.email, 'fpt_student@fpt.edu.vn');
    assert.ok(autoLoginResult.accessToken);
    assert.ok(elapsed < 500, `Auto login should execute under 500ms, took ${elapsed}ms`);

    // 4. Test Deep Link parser & router
    const deepLinkCheckin = parseDeepLink('https://zalo.me/s/polyfactory?action=checkin');
    assert.strictEqual(deepLinkCheckin.action, 'checkin');
    assert.strictEqual(resolveDeepLinkRoute(deepLinkCheckin), 'pages/attendance/index');

    const deepLinkShift = parseDeepLink('https://zalo.me/s/polyfactory?action=shift&shiftNumber=3');
    assert.strictEqual(deepLinkShift.action, 'shift');
    assert.strictEqual(deepLinkShift.shiftNumber, 3);
    assert.strictEqual(resolveDeepLinkRoute(deepLinkShift), 'pages/home/index?tab=shifts');
  });
});
