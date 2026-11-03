import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { GitHubWebhookService } from './github-webhook.service';
import * as crypto from 'crypto';

describe('GitHubWebhookService (T045 & T046)', () => {
  const secret = 'test_webhook_secret_key_123';
  const configMock: any = {
    get: (key: string, def: any) => secret,
  };

  it('T045 verifySignature validates HMAC-SHA256 signature (E-polyfactory-153)', () => {
    const service = new GitHubWebhookService({} as any, configMock, {} as any);
    const payload = JSON.stringify({ action: 'push' });

    // 1. Chữ ký chuẩn
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const validSignature = `sha256=${hmac.digest('hex')}`;

    assert.strictEqual(service.verifySignature(payload, validSignature), true);

    // 2. Chữ ký sai -> E-polyfactory-153
    assert.throws(
      () => {
        service.verifySignature(payload, 'sha256=invalid_hex_string_1234567890abcdef');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-153');
        return true;
      },
    );

    // 3. Thiếu prefix sha256= -> E-polyfactory-153
    assert.throws(
      () => {
        service.verifySignature(payload, 'bad_prefix');
      },
      (err: any) => {
        assert.strictEqual(err.response?.errorCode, 'E-polyfactory-153');
        return true;
      },
    );
  });

  it('T045 processWebhook deduplicates deliveries, filters branch, awards +5 EXP commit and +15 EXP PR', async () => {
    const deliveries: string[] = [];
    const activities: any[] = [];
    let awardedExp: { userId: string; amount: number; source: string }[] = [];

    const mockProject = {
      id: 'proj_gh',
      githubRepoUrl: 'https://github.com/poly/repo',
      githubArchivedAt: null,
    };

    const mockUser = {
      id: 'user_dev',
      githubUsername: 'octocat',
    };

    const prismaMock: any = {
      webhookDelivery: {
        findUnique: async (args: any) => (deliveries.includes(args.where.deliveryId) ? { id: args.where.deliveryId } : null),
        create: async (args: any) => {
          deliveries.push(args.data.deliveryId);
          return args.data;
        },
      },
      project: {
        findFirst: async () => mockProject,
        update: async (args: any) => {
          Object.assign(mockProject, args.data);
          return mockProject;
        },
      },
      user: {
        findUnique: async (args: any) => (args.where.githubUsername === 'octocat' ? mockUser : null),
      },
      projectActivity: {
        findUnique: async (args: any) => activities.find((a) => a.commitHash === args.where.commitHash),
        create: async (args: any) => {
          activities.push(args.data);
          return args.data;
        },
      },
    };

    const expLedgerMock: any = {
      recordTransaction: async (userId: string, amount: number, source: string) => {
        awardedExp.push({ userId, amount, source });
      },
    };

    const service = new GitHubWebhookService(prismaMock, configMock, expLedgerMock);

    // 1. Sự kiện push vào nhánh phụ feature/abc -> Bị bỏ qua
    const resIgnored = await service.processWebhook('deliv_1', 'push', {
      repository: { html_url: 'https://github.com/poly/repo' },
      ref: 'refs/heads/feature/test',
      commits: [{ id: 'c0', message: 'test', author: { username: 'octocat' } }],
    });
    assert.strictEqual(resIgnored.reason, 'BRANCH_IGNORED');

    // 2. Sự kiện push vào nhánh main -> Tạo activity và thưởng +5 EXP
    const resMain = await service.processWebhook('deliv_2', 'push', {
      repository: { html_url: 'https://github.com/poly/repo' },
      ref: 'refs/heads/main',
      commits: [{ id: 'c1', message: 'feat: add login', author: { username: 'octocat' } }],
    });
    assert.strictEqual(resMain.success, true);
    assert.strictEqual(activities.length, 1);
    assert.strictEqual(activities[0].commitHash, 'c1');
    assert.strictEqual(awardedExp.length, 1);
    assert.strictEqual(awardedExp[0].amount, 5);
    assert.strictEqual(awardedExp[0].source, 'GITHUB_COMMIT');

    // 3. Gửi lại deliveryId deliv_2 -> Chống trùng lặp
    const resDup = await service.processWebhook('deliv_2', 'push', {});
    assert.strictEqual(resDup.duplicate, true);

    // 4. Sự kiện PR merged -> Thưởng +15 EXP
    const resPr = await service.processWebhook('deliv_3', 'pull_request', {
      repository: { html_url: 'https://github.com/poly/repo' },
      action: 'closed',
      pull_request: {
        number: 42,
        merged: true,
        title: 'PR Title',
        merge_commit_sha: 'sha_merge_42',
        user: { login: 'octocat' },
        base: { ref: 'main' },
      },
    });
    assert.strictEqual(resPr.success, true);
    assert.strictEqual(awardedExp.length, 2);
    assert.strictEqual(awardedExp[1].amount, 15);
    assert.strictEqual(awardedExp[1].source, 'GITHUB_PR_MERGED');
  });
});
