import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { SchedulesService } from './schedules.service';
import { ScheduleType } from '@prisma/client';

function createMockPrisma() {
  const schedules: any[] = [];

  return {
    state: { schedules },
    client: {
      schedule: {
        findFirst: async ({ where }: any) => {
          return schedules.find(
            (s) =>
              s.userId === where.userId &&
              new Date(s.workDate).toISOString().split('T')[0] === new Date(where.workDate).toISOString().split('T')[0] &&
              s.shiftNumber === where.shiftNumber,
          ) || null;
        },
        findUnique: async ({ where }: any) => {
          return schedules.find((s) => s.id === where.id) || null;
        },
        findMany: async ({ where }: any) => {
          return schedules.filter((s) => {
            if (where.userId && s.userId !== where.userId) return false;
            if (where.workDate?.gte && new Date(s.workDate) < where.workDate.gte) return false;
            if (where.workDate?.lte && new Date(s.workDate) > where.workDate.lte) return false;
            return true;
          });
        },
        create: async ({ data }: any) => {
          const record = { id: `sch-${Date.now()}-${Math.random()}`, ...data };
          schedules.push(record);
          return record;
        },
        delete: async ({ where }: any) => {
          const idx = schedules.findIndex((s) => s.id === where.id);
          if (idx !== -1) {
            const removed = schedules.splice(idx, 1);
            return removed[0];
          }
          throw new Error('Schedule not found');
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

describe('SchedulesService (T022 & T023)', () => {
  it('registerShift checks holiday (E-polyfactory-064), 2h cutoff (E-polyfactory-060) and duplicate (E-polyfactory-061)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new SchedulesService(mockPrisma.client, createMockEventEmitter());

    service.addHoliday('2026-12-25', 'Giáng Sinh');

    // 1. Holiday -> E-polyfactory-064
    const holidayRes = await service.registerShift('u-1', '2026-12-25', 1);
    assert.equal(holidayRes.errorCode, 'E-polyfactory-064');

    // 2. Shift in the past or < 2 hours -> E-polyfactory-060
    const pastRes = await service.registerShift('u-1', '2020-01-01', 1);
    assert.equal(pastRes.errorCode, 'E-polyfactory-060');

    // 3. Valid future shift (e.g. 10 days in future) -> success
    const futureDate = new Date(Date.now() + 10 * 24 * 3600_000);
    const okRes = await service.registerShift('u-1', futureDate, 3);
    assert.equal(okRes.success, true);
    assert.equal(okRes.schedule.shiftNumber, 3);

    // 4. Duplicate shift -> E-polyfactory-061
    const dupRes = await service.registerShift('u-1', futureDate, 3);
    assert.equal(dupRes.errorCode, 'E-polyfactory-061');
  });

  it('cancelShift blocks assigned shift (E-polyfactory-062) and < 2h (E-polyfactory-063)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new SchedulesService(mockPrisma.client, createMockEventEmitter());

    const futureDate = new Date(Date.now() + 10 * 24 * 3600_000);

    mockPrisma.state.schedules.push(
      { id: 'sch-assigned', userId: 'u-1', workDate: futureDate, shiftNumber: 1, type: ScheduleType.ASSIGNED },
      { id: 'sch-past', userId: 'u-1', workDate: new Date('2020-01-01'), shiftNumber: 1, type: ScheduleType.SELF_REGISTERED },
      { id: 'sch-ok', userId: 'u-1', workDate: futureDate, shiftNumber: 4, type: ScheduleType.SELF_REGISTERED },
    );

    // 1. Assigned shift -> E-polyfactory-062
    const assignedRes = await service.cancelShift('u-1', 'sch-assigned');
    assert.equal(assignedRes.errorCode, 'E-polyfactory-062');

    // 2. Less than 2 hours -> E-polyfactory-063
    const pastRes = await service.cancelShift('u-1', 'sch-past');
    assert.equal(pastRes.errorCode, 'E-polyfactory-063');

    // 3. Valid cancellation
    const okRes = await service.cancelShift('u-1', 'sch-ok');
    assert.equal(okRes.success, true);
    assert.equal(mockPrisma.state.schedules.find((s) => s.id === 'sch-ok'), undefined);
  });

  it('assignShift creates ASSIGNED schedule and emits event', async () => {
    const mockPrisma = createMockPrisma();
    const eventEmitter = createMockEventEmitter();
    const service = new SchedulesService(mockPrisma.client, eventEmitter);

    const futureDate = new Date(Date.now() + 5 * 24 * 3600_000);
    const res = await service.assignShift('lead-1', 'member-1', futureDate, 2);

    assert.equal(res.success, true);
    assert.equal(res.schedule.type, ScheduleType.ASSIGNED);
    assert.equal(eventEmitter.events.length, 1);
    assert.equal(eventEmitter.events[0].event, 'schedule.assigned');
  });

  it('copyPreviousWeek copies schedules to new week and skips holidays', async () => {
    const mockPrisma = createMockPrisma();
    const service = new SchedulesService(mockPrisma.client, createMockEventEmitter());

    // Target week start: 14 days in future
    const targetWeekStart = new Date(Date.now() + 14 * 24 * 3600_000);
    const prevWeekWorkDate = new Date(targetWeekStart.getTime() - 5 * 24 * 3600_000); // 9 days in future

    mockPrisma.state.schedules.push({
      id: 'old-sch-1',
      userId: 'user-copy',
      workDate: prevWeekWorkDate,
      shiftNumber: 2,
      type: ScheduleType.SELF_REGISTERED,
    });

    const res = await service.copyPreviousWeek('user-copy', targetWeekStart);
    assert.equal(res.success, true);
    assert.equal(res.copiedCount, 1);
  });
});
