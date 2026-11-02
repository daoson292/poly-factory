import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ReportsService } from './reports.service';
import { AttendanceStatus } from '@prisma/client';

describe('ReportsService (T030 - Attendance Metrics)', () => {
  it('calculates 4 core attendance metrics correctly and excludes EXCUSED and CANCELLED shifts', async () => {
    const mockSchedules = [
      { id: 's1', userId: 'u1', workDate: new Date('2026-11-01T08:00:00Z'), attendance: { status: AttendanceStatus.PRESENT } },
      { id: 's2', userId: 'u1', workDate: new Date('2026-11-02T08:00:00Z'), attendance: { status: AttendanceStatus.PRESENT } },
      { id: 's3', userId: 'u1', workDate: new Date('2026-11-03T08:00:00Z'), attendance: { status: AttendanceStatus.UNEXCUSED_ABSENCE } },
      { id: 's4', userId: 'u1', workDate: new Date('2026-11-04T08:00:00Z'), attendance: { status: AttendanceStatus.EXCUSED_ABSENCE } },
      { id: 's5', userId: 'u1', workDate: new Date('2026-11-05T08:00:00Z'), attendance: { status: AttendanceStatus.CANCELLED_BY_ROOM } },
    ];

    const mockAttendances = [
      { id: 'a1', userId: 'u1', isWalkIn: false, status: AttendanceStatus.PRESENT },
      { id: 'a2', userId: 'u1', isWalkIn: false, status: AttendanceStatus.PRESENT },
      { id: 'a3', userId: 'u1', isWalkIn: true, status: AttendanceStatus.PRESENT }, // Walk-in
      { id: 'a4', userId: 'u1', isWalkIn: true, status: AttendanceStatus.PRESENT }, // Walk-in
    ];

    const prismaMock: any = {
      schedule: {
        findMany: async () => mockSchedules,
      },
      attendance: {
        findMany: async () => mockAttendances,
      },
    };

    const service = new ReportsService(prismaMock);
    const metrics = await service.getUserAttendanceMetrics('u1');

    // S_scheduled: s1, s2, s3 (total 3, s4 EXCUSED & s5 CANCELLED excluded)
    assert.strictEqual(metrics.scheduledShiftsCount, 3);
    // A_scheduled: a1, a2 (2 attended scheduled shifts)
    assert.strictEqual(metrics.attendedScheduledCount, 2);
    // Walk-in count: a3, a4 (2 walk-in shifts)
    assert.strictEqual(metrics.walkInCount, 2);
    // Attendance rate = (2 / 3) * 100 = 67%
    assert.strictEqual(metrics.attendanceRate, 67);
  });

  it('ensures walkInCount does not inflate attendanceRate beyond 100%', async () => {
    const mockSchedules = [
      { id: 's1', userId: 'u2', workDate: new Date('2026-11-01T08:00:00Z'), attendance: { status: AttendanceStatus.PRESENT } },
    ];

    const mockAttendances = [
      { id: 'a1', userId: 'u2', isWalkIn: false, status: AttendanceStatus.PRESENT },
      { id: 'a2', userId: 'u2', isWalkIn: true, status: AttendanceStatus.PRESENT },
      { id: 'a3', userId: 'u2', isWalkIn: true, status: AttendanceStatus.PRESENT },
      { id: 'a4', userId: 'u2', isWalkIn: true, status: AttendanceStatus.PRESENT },
    ];

    const prismaMock: any = {
      schedule: {
        findMany: async () => mockSchedules,
      },
      attendance: {
        findMany: async () => mockAttendances,
      },
    };

    const service = new ReportsService(prismaMock);
    const metrics = await service.getUserAttendanceMetrics('u2');

    assert.strictEqual(metrics.scheduledShiftsCount, 1);
    assert.strictEqual(metrics.attendedScheduledCount, 1);
    assert.strictEqual(metrics.walkInCount, 3);
    assert.strictEqual(metrics.attendanceRate, 100);
  });

  it('defaults attendanceRate to 100% when there are 0 scheduled shifts', async () => {
    const prismaMock: any = {
      schedule: {
        findMany: async () => [],
      },
      attendance: {
        findMany: async () => [],
      },
    };

    const service = new ReportsService(prismaMock);
    const metrics = await service.getUserAttendanceMetrics('u3');

    assert.strictEqual(metrics.scheduledShiftsCount, 0);
    assert.strictEqual(metrics.attendedScheduledCount, 0);
    assert.strictEqual(metrics.walkInCount, 0);
    assert.strictEqual(metrics.attendanceRate, 100);
  });
});
