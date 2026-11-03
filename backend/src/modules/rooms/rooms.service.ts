import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus, RoomStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getCurrentStatus() {
    const latest = await this.prisma.roomConfig.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { updatedBy: { select: { fullName: true, email: true } } },
    });

    if (!latest) {
      return {
        currentRoom: 'P407',
        status: RoomStatus.OPEN,
        isReverted: false,
      };
    }

    // Auto-revert check (Mục 6.10 SRS)
    if (latest.revertAt && new Date() > latest.revertAt) {
      return {
        currentRoom: 'P407',
        status: RoomStatus.OPEN,
        reason: null,
        revertAt: null,
        isReverted: true,
      };
    }

    return {
      ...latest,
      isReverted: false,
    };
  }

  async updateStatus(
    userId: string,
    data: { status: RoomStatus; tempRoom?: string; reason?: string; revertAt?: Date },
  ) {
    const now = new Date();

    // Ràng buộc khi MOVED hoặc CLOSED
    if (data.status === RoomStatus.MOVED || data.status === RoomStatus.CLOSED) {
      if (!data.reason?.trim() || !data.revertAt) {
        return {
          success: false,
          errorCode: 'E-polyfactory-050',
          message: 'Khi chuyển phòng hoặc đóng phòng, bắt buộc nhập lý do và thời gian hoàn nguyên.',
        };
      }

      const revertDate = new Date(data.revertAt);
      if (revertDate <= now) {
        return {
          success: false,
          errorCode: 'E-polyfactory-051',
          message: 'Thời gian hoàn nguyên phải ở tương lai.',
        };
      }
    }

    const config = await this.prisma.roomConfig.create({
      data: {
        updatedById: userId,
        status: data.status,
        tempRoom: data.status === RoomStatus.MOVED ? data.tempRoom?.trim() : null,
        currentRoom: data.status === RoomStatus.MOVED ? (data.tempRoom?.trim() || 'P407') : 'P407',
        reason: data.reason?.trim() || null,
        revertAt: data.revertAt ? new Date(data.revertAt) : null,
      },
    });

    // Khi phòng CLOSED: Tự động chuyển các ca trực nằm trong khoảng đóng cửa sang CANCELLED_BY_ROOM
    let affectedShiftsCount = 0;
    if (data.status === RoomStatus.CLOSED && data.revertAt) {
      const revertDate = new Date(data.revertAt);
      const affectedSchedules = await this.prisma.schedule.findMany({
        where: {
          workDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lte: revertDate,
          },
        },
      });

      affectedShiftsCount = affectedSchedules.length;

      for (const schedule of affectedSchedules) {
        const existingAttendance = await this.prisma.attendance.findFirst({
          where: {
            userId: schedule.userId,
            scheduleId: schedule.id,
          },
        });

        if (existingAttendance) {
          await this.prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: { status: AttendanceStatus.CANCELLED_BY_ROOM },
          });
        } else {
          await this.prisma.attendance.create({
            data: {
              userId: schedule.userId,
              scheduleId: schedule.id,
              status: AttendanceStatus.CANCELLED_BY_ROOM,
              isWalkIn: false,
            },
          });
        }
      }

      this.eventEmitter.emit('room.status.closed', {
        config,
        affectedShiftsCount,
      });
    }

    this.eventEmitter.emit('room.status.changed', {
      config,
      actorId: userId,
    });

    return {
      success: true,
      config,
      affectedShiftsCount,
    };
  }
}
