import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ZaloMiniAppService } from './zalo-miniapp.service';

describe('ZaloMiniAppService (T063)', () => {
  it('generates 6-digit code, enforces 10-minute TTL (E-polyfactory-282), and auto-logs in', async () => {
    let linkedUser: any = {
      id: 'u_zalo',
      email: 'student@fpt.edu.vn',
      role: 'MEMBER',
      status: 'ACTIVE',
      zaloUserId: null,
    };

    const prismaMock: any = {
      user: {
        update: async (args: any) => {
          Object.assign(linkedUser, args.data);
          return linkedUser;
        },
        findUnique: async (args: any) => {
          if (args.where.zaloUserId === 'zalo_uid_123') return linkedUser;
          return null;
        },
      },
    };

    const jwtMock: any = {
      sign: (payload: any) => `jwt_token_${payload.sub}`,
    };

    const service = new ZaloMiniAppService(prismaMock, jwtMock);

    // 1. Sinh mã 6 chữ số
    const { code, expiresInSeconds } = service.generateLinkCode('u_zalo');
    assert.strictEqual(code.length, 6);
    assert.strictEqual(expiresInSeconds, 600);

    // 2. Nhập sai mã -> E-polyfactory-282
    await assert.rejects(
      async () => {
        await service.verifyAndLinkZalo('000000', 'zalo_uid_123');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-282');
        return true;
      },
    );

    // 3. Nhập đúng mã -> Liên kết thành công
    const linkRes = await service.verifyAndLinkZalo(code, 'zalo_uid_123');
    assert.strictEqual(linkRes.success, true);
    assert.strictEqual(linkedUser.zaloUserId, 'zalo_uid_123');
    assert.ok(linkRes.accessToken.includes('u_zalo'));

    // 4. Đăng nhập tự động qua Zalo ID
    const autoRes = await service.autoLogin('zalo_uid_123');
    assert.strictEqual(autoRes.linked, true);
    assert.ok(autoRes.accessToken);

    // 5. Zalo ID chưa liên kết
    const unlinkedRes = await service.autoLogin('unlinked_zalo_user');
    assert.strictEqual(unlinkedRes.linked, false);
  });
});
