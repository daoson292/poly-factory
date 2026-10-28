import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { NotificationsService } from './notifications.service';
import { NotificationCategory } from '@prisma/client';

describe('NotificationsService (T034)', () => {
  it('creates notification and filters unread popups for target team / all', async () => {
    const notifications: any[] = [];
    const reads: any[] = [];

    const prismaMock: any = {
      user: {
        findUnique: async () => ({ id: 'u1', teamId: 'teamA' }),
      },
      notification: {
        create: async (args: any) => {
          const item = { id: `n_${notifications.length + 1}`, ...args.data };
          notifications.push(item);
          return item;
        },
        findMany: async (args: any) => {
          return notifications.filter((n) => {
            const matchesCategory = n.category === args.where.category;
            const matchesTeam = !n.targetTeamId || n.targetTeamId === 'teamA';
            const notRead = !reads.some((r) => r.notificationId === n.id && r.userId === 'u1');
            return matchesCategory && matchesTeam && notRead;
          });
        },
        findUnique: async (args: any) => notifications.find((n) => n.id === args.where.id),
      },
      notificationRead: {
        upsert: async (args: any) => {
          const item = { id: `r_${reads.length + 1}`, ...args.create, readAt: new Date() };
          reads.push(item);
          return item;
        },
        count: async (args: any) => reads.filter((r) => r.notificationId === args.where.notificationId).length,
      },
    };

    const service = new NotificationsService(prismaMock);

    // 1. Tạo thông báo khẩn toàn xưởng
    const notif1 = await service.createNotification('lead1', {
      title: 'Họp khẩn toàn xưởng',
      content: 'Tất cả thành viên có mặt lúc 14h',
      category: NotificationCategory.URGENT_POPUP,
    });
    assert.strictEqual(notif1.id, 'n_1');

    // 2. Tạo thông báo khẩn team khác (teamB)
    await service.createNotification('lead1', {
      title: 'Họp Team B',
      content: 'Chỉ dành cho team B',
      category: NotificationCategory.URGENT_POPUP,
      targetTeamId: 'teamB',
    });

    // 3. User teamA chỉ nhận popup notif1
    const unreadBefore = await service.getUnreadPopups('u1');
    assert.strictEqual(unreadBefore.length, 1);
    assert.strictEqual(unreadBefore[0].id, 'n_1');

    // 4. User xác nhận "Đã nắm thông tin"
    const ack = await service.acknowledgeNotification('u1', 'n_1');
    assert.ok(ack);

    // 5. Sau khi đọc, danh sách unread popups trống
    const unreadAfter = await service.getUnreadPopups('u1');
    assert.strictEqual(unreadAfter.length, 0);

    // 6. Thống kê số người đọc
    const stats = await service.getNotificationReadStats('n_1');
    assert.strictEqual(stats.readCount, 1);
  });
});
