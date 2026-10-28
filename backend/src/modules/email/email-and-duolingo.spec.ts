import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { EmailService } from './email.service';
import { DuolingoRemindersService } from '../duolingo-reminders/duolingo-reminders.service';
import { AttendanceStatus } from '@prisma/client';

describe('EmailService & DuolingoReminders (T035)', () => {
  it('EmailService enforces 440 email/day cap and respects user emailPreferences', async () => {
    const configMock: any = {
      get: (key: string, def?: any) => def,
    };

    const emailService = new EmailService(configMock);
    emailService.resetCounterForTesting();

    // 1. Gửi thành công khi dưới 440
    const res1 = await emailService.sendEmail('student@fpt.edu.vn', 'Chào mừng', '<p>Hello</p>');
    assert.strictEqual(res1.sent, true);
    assert.strictEqual(emailService.getDailySentCount(), 1);

    // 2. Tôn trọng emailPreferences: người dùng tắt category 'marketing'
    const resOptOut = await emailService.sendEmail(
      'student@fpt.edu.vn',
      'Sự kiện mới',
      '<p>News</p>',
      {
        category: 'marketing',
        emailPreferences: { marketing: false, shift_reminder: true },
      },
    );
    assert.strictEqual(resOptOut.sent, false);
    assert.strictEqual(resOptOut.reason, 'USER_OPTED_OUT');
    assert.strictEqual(emailService.getDailySentCount(), 1); // không tốn quota

    // 3. Chạm trần 440 emails
    for (let i = 1; i < 440; i++) {
      await emailService.sendEmail('test@fpt.edu.vn', `Email #${i}`, '<p>Test</p>');
    }
    assert.strictEqual(emailService.getDailySentCount(), 440);

    // Email thường thứ 441 bị từ chối
    const resCap = await emailService.sendEmail('overflow@fpt.edu.vn', 'Quá trần', '<p>Blocked</p>');
    assert.strictEqual(resCap.sent, false);
    assert.strictEqual(resCap.reason, 'DAILY_LIMIT_EXCEEDED');

    // Email khẩn cấp (isUrgent: true) vẫn được bypass
    const resUrgent = await emailService.sendEmail(
      'emergency@fpt.edu.vn',
      'Khẩn cấp',
      '<p>Emergency</p>',
      { isUrgent: true },
    );
    assert.strictEqual(resUrgent.sent, true);
  });

  it('DuolingoRemindersService warns when user misses >= 3 shifts in current week or month (BR-241)', async () => {
    const now = new Date('2026-11-06T12:00:00Z'); // Thứ Sáu trong tuần

    const mockAttendances = [
      // User 1: vắng 3 ca trong tuần này
      {
        id: 'att1',
        userId: 'u1',
        status: AttendanceStatus.UNEXCUSED_ABSENCE,
        createdAt: new Date('2026-11-02T08:00:00Z'), // Thứ 2
        user: { id: 'u1', fullName: 'Nguyen Van A', email: 'anv@fpt.edu.vn' },
      },
      {
        id: 'att2',
        userId: 'u1',
        status: AttendanceStatus.UNEXCUSED_ABSENCE,
        createdAt: new Date('2026-11-03T08:00:00Z'), // Thứ 3
        user: { id: 'u1', fullName: 'Nguyen Van A', email: 'anv@fpt.edu.vn' },
      },
      {
        id: 'att3',
        userId: 'u1',
        status: AttendanceStatus.UNEXCUSED_ABSENCE,
        createdAt: new Date('2026-11-04T08:00:00Z'), // Thứ 4
        user: { id: 'u1', fullName: 'Nguyen Van A', email: 'anv@fpt.edu.vn' },
      },
      // User 2: chỉ vắng 1 ca trong tuần
      {
        id: 'att4',
        userId: 'u2',
        status: AttendanceStatus.UNEXCUSED_ABSENCE,
        createdAt: new Date('2026-11-03T08:00:00Z'),
        user: { id: 'u2', fullName: 'Le Van B', email: 'blv@fpt.edu.vn' },
      },
    ];

    const prismaMock: any = {
      attendance: {
        findMany: async () => mockAttendances,
      },
    };

    const service = new DuolingoRemindersService(prismaMock);
    const warnings = await service.checkWeeklyAndMonthlyMisses(now);

    assert.strictEqual(warnings.length, 1);
    assert.strictEqual(warnings[0].userId, 'u1');
    assert.strictEqual(warnings[0].weeklyMisses, 3);
    assert.ok(warnings[0].message.includes('vắng 3 ca trong tuần'));
  });
});
