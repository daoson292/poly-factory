import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus, TicketStatus, TicketType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getShiftStartAndEndTime } from '../schedules/shift-time.util';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createTicket(
    userId: string,
    data: {
      scheduleId?: string;
      workDate?: string | Date;
      shiftNumber?: number;
      ticketType: TicketType;
      reason: string;
      expectedArrivalTime?: string;
    },
  ) {
    if (!data.reason || data.reason.trim().length < 5) {
      return {
        success: false,
        errorCode: 'E-polyfactory-113',
        message: 'Lý do xin phép phải có ít nhất 5 ký tự.',
      };
    }

    let targetScheduleId = data.scheduleId;
    let schedule: any = null;
    if (targetScheduleId) {
      schedule = await this.prisma.schedule.findUnique({
        where: { id: targetScheduleId },
      });
    } else if (data.workDate && data.shiftNumber) {
      const dateStr = typeof data.workDate === 'string'
        ? data.workDate.split('T')[0]
        : (data.workDate as Date).toISOString().split('T')[0];
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(startOfDay.getTime() + 24 * 3600_000);
      schedule = await this.prisma.schedule.findFirst({
        where: {
          userId,
          shiftNumber: data.shiftNumber,
          workDate: { gte: startOfDay, lt: endOfDay },
        },
      });
      if (schedule) {
        targetScheduleId = schedule.id;
      }
    }

    if (!schedule || !targetScheduleId) {
      throw new NotFoundException('Không tìm thấy lịch trực để tạo đơn xin phép.');
    }

    if (schedule.userId !== userId) {
      throw new BadRequestException('Bạn chỉ được tạo đơn cho ca trực của chính mình.');
    }

    // 1. Kiểm tra gửi trước giờ vào ca ít nhất 30 phút (E-polyfactory-110)
    try {
      const { shiftStartTime } = getShiftStartAndEndTime(schedule.workDate, schedule.shiftNumber);
      const diffMs = shiftStartTime.getTime() - Date.now();
      if (diffMs < 30 * 60 * 1000) {
        return {
          success: false,
          errorCode: 'E-polyfactory-110',
          message:
            'Đơn xin nghỉ hoặc đi muộn phải được gửi trước giờ vào ca ít nhất 30 phút.',
        };
      }
    } catch {
      // Bỏ qua nếu ngày không hợp lệ
    }

    // 2. Chặn gửi trùng đơn PENDING trên cùng ca (E-polyfactory-111)
    const existingPending = await this.prisma.leaveTicket.findFirst({
      where: {
        scheduleId: targetScheduleId,
        status: TicketStatus.PENDING,
      },
    });

    if (existingPending) {
      return {
        success: false,
        errorCode: 'E-polyfactory-111',
        message: 'Bạn đã có đơn xin phép đang chờ duyệt cho ca này.',
      };
    }

    const ticket = await this.prisma.leaveTicket.create({
      data: {
        userId,
        scheduleId: targetScheduleId,
        ticketType: data.ticketType,
        reason: data.reason.trim(),
        expectedArrivalTime: data.expectedArrivalTime?.trim() || null,
        status: TicketStatus.PENDING,
      },
    });

    this.eventEmitter.emit('ticket.created', {
      ticket,
      userId,
    });

    return {
      success: true,
      ticket,
    };
  }

  async reviewTicket(
    leadId: string,
    ticketId: string,
    data: { status: TicketStatus; feedback?: string },
  ) {
    const ticket = await this.prisma.leaveTicket.findUnique({
      where: { id: ticketId },
      include: { schedule: { include: { attendance: true } } },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy đơn xin phép.');
    }

    // Chặn duyệt lại đơn không còn PENDING (E-polyfactory-112)
    if (ticket.status !== TicketStatus.PENDING) {
      return {
        success: false,
        errorCode: 'E-polyfactory-112',
        message: 'Đơn từ này đã được duyệt trước đó và không thể xử lý lại.',
      };
    }

    const updatedTicket = await this.prisma.leaveTicket.update({
      where: { id: ticketId },
      data: {
        reviewedById: leadId,
        status: data.status,
      },
    });

    // Nếu ca đã ở trạng thái WAITING_TICKET_REVIEW, tự động cập nhật kết quả điểm danh
    const att = ticket.schedule?.attendance;
    if (att && att.status === AttendanceStatus.WAITING_TICKET_REVIEW) {
      const nextStatus =
        data.status === TicketStatus.APPROVED
          ? AttendanceStatus.EXCUSED_ABSENCE
          : AttendanceStatus.UNEXCUSED_ABSENCE;

      await this.prisma.attendance.update({
        where: { id: att.id },
        data: { status: nextStatus },
      });

      if (nextStatus === AttendanceStatus.UNEXCUSED_ABSENCE) {
        this.eventEmitter.emit('attendance.unexcused_absence', {
          userId: ticket.userId,
          scheduleId: ticket.scheduleId,
          workDate: ticket.schedule.workDate,
        });
      }
    }

    this.eventEmitter.emit('ticket.reviewed', {
      ticket: updatedTicket,
      reviewerId: leadId,
    });

    return {
      success: true,
      ticket: updatedTicket,
    };
  }
}
