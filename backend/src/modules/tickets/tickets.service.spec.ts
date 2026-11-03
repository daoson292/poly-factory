import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { TicketsService } from './tickets.service';
import { AttendanceStatus, TicketStatus, TicketType } from '@prisma/client';

function createMockPrisma() {
  const tickets = new Map<string, any>();
  const schedules = new Map<string, any>();
  const attendances = new Map<string, any>();

  return {
    state: { tickets, schedules, attendances },
    client: {
      schedule: {
        findUnique: async ({ where }: any) => schedules.get(where.id) || null,
        findFirst: async ({ where }: any) => {
          for (const s of schedules.values()) {
            if (where.userId && s.userId !== where.userId) continue;
            if (where.shiftNumber && s.shiftNumber !== where.shiftNumber) continue;
            return s;
          }
          return null;
        },
      },
      leaveTicket: {
        findFirst: async ({ where }: any) => {
          for (const t of tickets.values()) {
            if (t.scheduleId === where.scheduleId && t.status === where.status) return t;
          }
          return null;
        },
        findUnique: async ({ where }: any) => {
          const t = tickets.get(where.id);
          if (!t) return null;
          const sch = schedules.get(t.scheduleId);
          const att = sch ? attendances.get(sch.id) : null;
          return { ...t, schedule: sch ? { ...sch, attendance: att } : null };
        },
        create: async ({ data }: any) => {
          const t = { id: `tk-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          tickets.set(t.id, t);
          return t;
        },
        update: async ({ where, data }: any) => {
          const t = tickets.get(where.id);
          if (!t) throw new Error('Ticket not found');
          const next = { ...t, ...data };
          tickets.set(where.id, next);
          return next;
        },
      },
      attendance: {
        update: async ({ where, data }: any) => {
          for (const [id, a] of attendances.entries()) {
            if (a.id === where.id) {
              const next = { ...a, ...data };
              attendances.set(id, next);
              return next;
            }
          }
          throw new Error('Attendance not found');
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

describe('TicketsService (T027)', () => {
  it('createTicket checks 30m cutoff (E-polyfactory-110), duplicate pending ticket (E-polyfactory-111)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new TicketsService(mockPrisma.client, createMockEventEmitter());

    // Schedule 1: in the past -> E-polyfactory-110
    mockPrisma.state.schedules.set('sch-past', {
      id: 'sch-past',
      userId: 'u-1',
      workDate: new Date('2020-01-01'),
      shiftNumber: 1,
    });

    // Schedule 2: 5 days in future -> valid
    const futureDate = new Date(Date.now() + 5 * 24 * 3600_000);
    mockPrisma.state.schedules.set('sch-future', {
      id: 'sch-future',
      userId: 'u-1',
      workDate: futureDate,
      shiftNumber: 2,
    });

    // 1. Cutoff check
    const pastRes = await service.createTicket('u-1', {
      scheduleId: 'sch-past',
      ticketType: TicketType.LEAVE,
      reason: 'Bận việc gia đình đột xuất',
    });
    assert.equal(pastRes.errorCode, 'E-polyfactory-110');

    // 2. Valid creation
    const okRes = await service.createTicket('u-1', {
      scheduleId: 'sch-future',
      ticketType: TicketType.LEAVE,
      reason: 'Bận thi môn chuyên ngành',
    });
    assert.equal(okRes.success, true);
    assert.equal(okRes.ticket.status, TicketStatus.PENDING);

    // 3. Duplicate pending ticket -> E-polyfactory-111
    const dupRes = await service.createTicket('u-1', {
      scheduleId: 'sch-future',
      ticketType: TicketType.LEAVE,
      reason: 'Gửi lại đơn xin nghỉ',
    });
    assert.equal(dupRes.errorCode, 'E-polyfactory-111');
  });

  it('reviewTicket updates WAITING_TICKET_REVIEW attendance and blocks re-reviewing (E-polyfactory-112)', async () => {
    const mockPrisma = createMockPrisma();
    const eventEmitter = createMockEventEmitter();
    const service = new TicketsService(mockPrisma.client, eventEmitter);

    mockPrisma.state.schedules.set('sch-wait', {
      id: 'sch-wait',
      userId: 'u-wait',
      workDate: new Date(),
      shiftNumber: 1,
    });
    mockPrisma.state.attendances.set('sch-wait', {
      id: 'att-wait',
      userId: 'u-wait',
      scheduleId: 'sch-wait',
      status: AttendanceStatus.WAITING_TICKET_REVIEW,
    });
    mockPrisma.state.tickets.set('tk-review', {
      id: 'tk-review',
      userId: 'u-wait',
      scheduleId: 'sch-wait',
      status: TicketStatus.PENDING,
    });

    // Approve ticket -> updates attendance to EXCUSED_ABSENCE
    const reviewRes = await service.reviewTicket('lead-1', 'tk-review', {
      status: TicketStatus.APPROVED,
      feedback: 'Đã xác nhận lý do chính đáng',
    });
    assert.equal(reviewRes.success, true);
    assert.equal(reviewRes.ticket.status, TicketStatus.APPROVED);

    const updatedAtt = mockPrisma.state.attendances.get('sch-wait');
    assert.equal(updatedAtt.status, AttendanceStatus.EXCUSED_ABSENCE);

    // Re-reviewing already resolved ticket -> E-polyfactory-112
    const reReviewRes = await service.reviewTicket('lead-1', 'tk-review', {
      status: TicketStatus.REJECTED,
    });
    assert.equal(reReviewRes.errorCode, 'E-polyfactory-112');
  });

  it('createTicket resolves scheduleId from workDate and shiftNumber when scheduleId is omitted', async () => {
    const mockPrisma = createMockPrisma();
    const service = new TicketsService(mockPrisma.client, createMockEventEmitter());

    const futureDate = new Date(Date.now() + 3 * 24 * 3600_000);
    const dateStr = futureDate.toISOString().split('T')[0];

    mockPrisma.state.schedules.set('sch-resolved-01', {
      id: 'sch-resolved-01',
      userId: 'user-zalo-ticket',
      workDate: futureDate,
      shiftNumber: 4,
    });

    const res = await service.createTicket('user-zalo-ticket', {
      workDate: dateStr,
      shiftNumber: 4,
      ticketType: TicketType.LEAVE,
      reason: 'Bận thi cuối kỳ môn Lập trình Web',
    });

    assert.equal(res.success, true);
    assert.equal(res.ticket.scheduleId, 'sch-resolved-01');
    assert.equal(res.ticket.status, TicketStatus.PENDING);
  });
});
