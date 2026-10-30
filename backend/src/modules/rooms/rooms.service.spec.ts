import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { RoomsService } from './rooms.service';
import { AttendanceStatus, RoomStatus } from '@prisma/client';

function createMockPrisma() {
  const roomConfigs: any[] = [];
  const schedules: any[] = [];
  const attendances: any[] = [];

  return {
    state: { roomConfigs, schedules, attendances },
    client: {
      roomConfig: {
        findFirst: async () => {
          if (roomConfigs.length === 0) return null;
          return roomConfigs[roomConfigs.length - 1];
        },
        create: async ({ data }: any) => {
          const config = { id: `rc-${Date.now()}`, createdAt: new Date(), ...data };
          roomConfigs.push(config);
          return config;
        },
      },
      schedule: {
        findMany: async ({ where }: any) => {
          return schedules.filter((s) => s.workDate >= where.workDate.gte && s.workDate <= where.workDate.lte);
        },
      },
      attendance: {
        findFirst: async ({ where }: any) => {
          return attendances.find((a) => a.userId === where.userId && a.scheduleId === where.scheduleId) || null;
        },
        create: async ({ data }: any) => {
          const record = { id: `att-${Date.now()}-${Math.random()}`, ...data };
          attendances.push(record);
          return record;
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

describe('RoomsService (T021)', () => {
  it('getCurrentStatus auto-reverts to P407 OPEN when now > revertAt', async () => {
    const mockPrisma = createMockPrisma();
    const service = new RoomsService(mockPrisma.client, createMockEventEmitter());

    // Config in past
    mockPrisma.state.roomConfigs.push({
      id: 'rc-1',
      status: RoomStatus.MOVED,
      currentRoom: 'P402',
      tempRoom: 'P402',
      reason: 'Thi công',
      revertAt: new Date(Date.now() - 3600_000), // 1 hour ago
      createdAt: new Date(Date.now() - 7200_000),
    });

    const status = await service.getCurrentStatus();
    assert.equal(status.currentRoom, 'P407');
    assert.equal(status.status, RoomStatus.OPEN);
    assert.equal(status.isReverted, true);
  });

  it('updateStatus enforces E-polyfactory-050 and E-polyfactory-051 for MOVED/CLOSED', async () => {
    const mockPrisma = createMockPrisma();
    const service = new RoomsService(mockPrisma.client, createMockEventEmitter());

    // 1. Missing reason / revertAt -> E-polyfactory-050
    const res1 = await service.updateStatus('u-lead', {
      status: RoomStatus.MOVED,
      tempRoom: 'P402',
    });
    assert.equal(res1.errorCode, 'E-polyfactory-050');

    // 2. revertAt in the past -> E-polyfactory-051
    const res2 = await service.updateStatus('u-lead', {
      status: RoomStatus.CLOSED,
      reason: 'Bảo trì',
      revertAt: new Date(Date.now() - 1000),
    });
    assert.equal(res2.errorCode, 'E-polyfactory-051');
  });

  it('updateStatus CLOSED converts shifts to CANCELLED_BY_ROOM and emits event', async () => {
    const mockPrisma = createMockPrisma();
    const eventEmitter = createMockEventEmitter();
    const service = new RoomsService(mockPrisma.client, eventEmitter);

    const now = new Date();
    const futureDate = new Date(Date.now() + 24 * 3600_000);

    mockPrisma.state.schedules.push(
      { id: 'sch-1', userId: 'user-a', workDate: now, shiftNumber: 1 },
      { id: 'sch-2', userId: 'user-b', workDate: futureDate, shiftNumber: 2 },
    );

    const res = await service.updateStatus('u-lead', {
      status: RoomStatus.CLOSED,
      reason: 'Khử khuẩn định kỳ',
      revertAt: new Date(Date.now() + 48 * 3600_000),
    });

    assert.equal(res.success, true);
    assert.equal(res.affectedShiftsCount, 2);
    assert.equal(mockPrisma.state.attendances.length, 2);
    assert.equal(mockPrisma.state.attendances[0].status, AttendanceStatus.CANCELLED_BY_ROOM);
    assert.equal(mockPrisma.state.attendances[1].status, AttendanceStatus.CANCELLED_BY_ROOM);

    const closedEvent = eventEmitter.events.find((e) => e.event === 'room.status.closed');
    assert.ok(closedEvent);
  });
});
