import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AttendanceService } from './attendance.service';
import { AttendanceStatus, GpsStatus, SessionStatus, TicketStatus, TicketType } from '@prisma/client';
import { authenticator } from 'otplib';

function createMockPrisma() {
  const sessions = new Map<string, any>();
  const attendances: any[] = [];
  const schedules = new Map<string, any>();
  const tickets = new Map<string, any>();
  const users = new Map<string, any>();

  return {
    state: { sessions, attendances, schedules, tickets, users },
    client: {
      attendanceSession: {
        findFirst: async ({ where }: any) => {
          for (const s of sessions.values()) {
            if (where.shiftNumber !== undefined && s.shiftNumber !== where.shiftNumber) continue;
            if (where.status !== undefined && s.status !== where.status) continue;
            return s;
          }
          return null;
        },
        findUnique: async ({ where }: any) => sessions.get(where.id) || null,
        create: async ({ data }: any) => {
          const s = { id: `sess-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          sessions.set(s.id, s);
          return s;
        },
      },
      attendance: {
        findFirst: async ({ where }: any) => {
          return attendances.find((a) => {
            if (where.sessionId && a.sessionId !== where.sessionId) return false;
            if (where.userId && typeof where.userId === 'string' && a.userId !== where.userId) return false;
            if (where.userId?.not && a.userId === where.userId.not) return false;
            if (where.deviceToken && a.deviceToken !== where.deviceToken) return false;
            if (where.scheduleId && a.scheduleId !== where.scheduleId) return false;
            return true;
          }) || null;
        },
        create: async ({ data }: any) => {
          const a = { id: `att-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          attendances.push(a);
          return a;
        },
        update: async ({ where, data }: any) => {
          const idx = attendances.findIndex((a) => a.id === where.id);
          if (idx !== -1) {
            attendances[idx] = { ...attendances[idx], ...data };
            return attendances[idx];
          }
          throw new Error('Attendance not found');
        },
      },
      schedule: {
        findFirst: async ({ where }: any) => {
          for (const sch of schedules.values()) {
            if (sch.userId === where.userId && sch.shiftNumber === where.shiftNumber) {
              return sch;
            }
          }
          return null;
        },
        findUnique: async ({ where }: any) => schedules.get(where.id) || null,
        findMany: async ({ where }: any) => {
          const res: any[] = [];
          for (const sch of schedules.values()) {
            if (sch.shiftNumber === where.shiftNumber) {
              const att = attendances.find((a) => a.scheduleId === sch.id) || null;
              const tList = Array.from(tickets.values()).filter((t) => t.scheduleId === sch.id);
              res.push({ ...sch, attendance: att, leaveTickets: tList });
            }
          }
          return res;
        },
      },
      leaveTicket: {
        findFirst: async ({ where }: any) => {
          for (const t of tickets.values()) {
            if (
              t.userId === where.userId &&
              t.scheduleId === where.scheduleId &&
              t.ticketType === where.ticketType &&
              t.status === where.status
            ) {
              return t;
            }
          }
          return null;
        },
      },
      user: {
        update: async ({ where, data }: any) => {
          const u = users.get(where.id) || { id: where.id };
          const next = { ...u, ...data };
          users.set(where.id, next);
          return next;
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

describe('AttendanceService (T024, T025, T026)', () => {
  it('T024: creates session, checks duplicate (E-polyfactory-080), validates TOTP and device locking', async () => {
    const mockPrisma = createMockPrisma();
    const service = new AttendanceService(mockPrisma.client, createMockEventEmitter());

    // 1. Create first session
    const sess1 = await service.createSession('lead-1', { shiftNumber: 1 });
    assert.equal(sess1.success, true);
    assert.ok(sess1.secretKey);

    // 2. Duplicate active session for same shift -> E-polyfactory-080
    const dupRes = await service.createSession('lead-1', { shiftNumber: 1 });
    assert.equal(dupRes.errorCode, 'E-polyfactory-080');

    // 3. Scan with wrong token -> E-polyfactory-081
    const badTokenRes = await service.scanCheckIn('user-a', {
      sessionId: sess1.session.id,
      qrToken: '000000',
      deviceToken: 'device-phone-1',
    });
    assert.equal(badTokenRes.errorCode, 'E-polyfactory-081');

    // 4. Scan with valid TOTP token -> success
    authenticator.options = { step: 10, window: 1 };
    const validToken = authenticator.generate(sess1.secretKey);

    const okScan = await service.scanCheckIn('user-a', {
      sessionId: sess1.session.id,
      qrToken: validToken,
      deviceToken: 'device-phone-1',
      lat: 21.0381,
      lng: 105.7468, // Exactly at P407 -> GREEN
    });
    assert.equal(okScan.success, true);
    assert.equal(okScan.gpsStatus, GpsStatus.GREEN);

    // 5. Duplicate scan by user-a -> E-polyfactory-082
    const dupScan = await service.scanCheckIn('user-a', {
      sessionId: sess1.session.id,
      qrToken: validToken,
      deviceToken: 'device-phone-1',
    });
    assert.equal(dupScan.errorCode, 'E-polyfactory-082');

    // 6. Device locking: user-b attempts to scan with user-a's device -> E-polyfactory-083
    const hijackScan = await service.scanCheckIn('user-b', {
      sessionId: sess1.session.id,
      qrToken: validToken,
      deviceToken: 'device-phone-1',
    });
    assert.equal(hijackScan.errorCode, 'E-polyfactory-083');
  });

  it('T025: calculates EXP correctly for walk-in (+0 EXP) and standard schedule (+10 EXP)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new AttendanceService(mockPrisma.client, createMockEventEmitter());

    const sess = await service.createSession('lead-1', { shiftNumber: 2 });
    authenticator.options = { step: 10, window: 1 };
    const validToken = authenticator.generate(sess.secretKey);

    // 1. Walk-in (no schedule) -> +0 EXP, isWalkIn: true
    const walkInRes = await service.scanCheckIn('user-walkin', {
      sessionId: sess.session.id,
      qrToken: validToken,
      deviceToken: 'device-walkin',
    });
    assert.equal(walkInRes.success, true);
    assert.equal(walkInRes.isWalkIn, true);
    assert.equal(walkInRes.expEarned, 0);

    // 2. With schedule + approved late ticket -> +10 EXP
    mockPrisma.state.schedules.set('sch-1', {
      id: 'sch-1',
      userId: 'user-scheduled',
      shiftNumber: 2,
      workDate: sess.session.sessionDate,
    });
    mockPrisma.state.tickets.set('ticket-late-1', {
      id: 'ticket-late-1',
      userId: 'user-scheduled',
      scheduleId: 'sch-1',
      ticketType: TicketType.LATE,
      status: TicketStatus.APPROVED,
    });

    const scheduledRes = await service.scanCheckIn('user-scheduled', {
      sessionId: sess.session.id,
      qrToken: validToken,
      deviceToken: 'device-scheduled',
    });
    assert.equal(scheduledRes.success, true);
    assert.equal(scheduledRes.isWalkIn, false);
    assert.equal(scheduledRes.expEarned, 10);
  });

  it('T025: adjustmentCheckIn enforces 7-day limit (E-polyfactory-087)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new AttendanceService(mockPrisma.client, createMockEventEmitter());

    // Schedule 10 days in the past
    mockPrisma.state.schedules.set('sch-old', {
      id: 'sch-old',
      userId: 'u-late',
      shiftNumber: 1,
      workDate: new Date(Date.now() - 10 * 24 * 3600_000),
    });

    const res = await service.adjustmentCheckIn('lead-1', 'sch-old');
    assert.equal(res.errorCode, 'E-polyfactory-087');
  });

  it('T026: closeShiftAutomatically classifies EXCUSED_ABSENCE, WAITING_TICKET_REVIEW, and UNEXCUSED_ABSENCE', async () => {
    const mockPrisma = createMockPrisma();
    const eventEmitter = createMockEventEmitter();
    const service = new AttendanceService(mockPrisma.client, eventEmitter);

    const today = new Date();

    // Schedule 1: Has approved ticket -> EXCUSED_ABSENCE
    mockPrisma.state.schedules.set('sch-approved', {
      id: 'sch-approved',
      userId: 'u-excused',
      shiftNumber: 1,
      workDate: today,
    });
    mockPrisma.state.tickets.set('ticket-1', {
      id: 'ticket-1',
      scheduleId: 'sch-approved',
      userId: 'u-excused',
      status: TicketStatus.APPROVED,
    });

    // Schedule 2: Has pending ticket -> WAITING_TICKET_REVIEW
    mockPrisma.state.schedules.set('sch-pending', {
      id: 'sch-pending',
      userId: 'u-waiting',
      shiftNumber: 1,
      workDate: today,
    });
    mockPrisma.state.tickets.set('ticket-2', {
      id: 'ticket-2',
      scheduleId: 'sch-pending',
      userId: 'u-waiting',
      status: TicketStatus.PENDING,
    });

    // Schedule 3: No ticket -> UNEXCUSED_ABSENCE
    mockPrisma.state.schedules.set('sch-none', {
      id: 'sch-none',
      userId: 'u-unexcused',
      shiftNumber: 1,
      workDate: today,
    });

    const closeRes = await service.closeShiftAutomatically(today, 1);
    assert.equal(closeRes.success, true);
    assert.equal(closeRes.results.excusedCount, 1);
    assert.equal(closeRes.results.waitingReviewCount, 1);
    assert.equal(closeRes.results.unexcusedCount, 1);

    // Check event emitted for unexcused absence
    const unexcusedEv = eventEmitter.events.find((e) => e.event === 'attendance.unexcused_absence');
    assert.ok(unexcusedEv);
    assert.equal(unexcusedEv.payload.userId, 'u-unexcused');
  });

  it('T024 & T065: scanCheckIn auto-detects active session and accepts flexible GPS/device/token fields', async () => {
    const mockPrisma = createMockPrisma();
    const service = new AttendanceService(mockPrisma.client, createMockEventEmitter());

    const sess = await service.createSession('lead-1', { shiftNumber: 3 });
    authenticator.options = { step: 10, window: 1 };
    const validToken = authenticator.generate(sess.secretKey);

    // Call without sessionId, using totpToken, deviceId, latitude, longitude
    const res = await service.scanCheckIn('user-zalo', {
      totpToken: validToken,
      deviceId: 'device-zalo-native-01',
      latitude: 21.0381,
      longitude: 105.7468,
    });

    assert.equal(res.success, true);
    assert.equal(res.gpsStatus, GpsStatus.GREEN);
    assert.ok(res.attendance);
    assert.equal(res.attendance.sessionId, sess.session.id);
  });
});
