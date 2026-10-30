import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getShiftStartAndEndTime, isAtLeastTwoHoursBefore } from './shift-time.util';

export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
}

@Injectable()
export class SchedulesService {
  private readonly holidays = new Map<string, string>(); // date string -> name

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Khởi tạo một số ngày nghỉ mẫu mặc định
    this.holidays.set('2026-01-01', 'Tết Dương Lịch');
    this.holidays.set('2026-04-30', 'Giải phóng miền Nam');
    this.holidays.set('2026-05-01', 'Quốc tế Lao động');
    this.holidays.set('2026-09-02', 'Quốc khánh');
  }

  // Quản lý ngày nghỉ (T023)
  addHoliday(date: string, name: string) {
    const cleanDate = date.trim();
    this.holidays.set(cleanDate, name.trim());
    return { success: true, date: cleanDate, name: name.trim() };
  }

  removeHoliday(date: string) {
    const cleanDate = date.trim();
    this.holidays.delete(cleanDate);
    return { success: true };
  }

  getHolidays(): HolidayItem[] {
    const list: HolidayItem[] = [];
    for (const [date, name] of this.holidays.entries()) {
      list.push({ date, name });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  isHoliday(dateInput: Date | string): boolean {
    const d = new Date(dateInput);
    const dateStr = d.toISOString().split('T')[0];
    return this.holidays.has(dateStr);
  }

  async registerShift(
    userId: string,
    workDateInput: Date | string,
    shiftNumber: number,
  ) {
    const workDate = new Date(workDateInput);

    // 1. Kiểm tra ngày nghỉ lễ / tuần thi xưởng (T023)
    if (this.isHoliday(workDate)) {
      return {
        success: false,
        errorCode: 'E-polyfactory-064',
        message: 'Không thể đăng ký lịch vào ngày nghỉ lễ hoặc tuần thi của xưởng.',
      };
    }

    // 2. Kiểm tra mốc 2 tiếng trước ca (E-polyfactory-060)
    const { shiftStartTime } = getShiftStartAndEndTime(workDate, shiftNumber);
    if (!isAtLeastTwoHoursBefore(new Date(), shiftStartTime)) {
      return {
        success: false,
        errorCode: 'E-polyfactory-060',
        message: 'Phải đăng ký lịch trước giờ vào ca ít nhất 2 tiếng.',
      };
    }

    // 3. Kiểm tra trùng ca đã có (E-polyfactory-061)
    const existing = await this.prisma.schedule.findFirst({
      where: {
        userId,
        workDate,
        shiftNumber,
      },
    });

    if (existing) {
      return {
        success: false,
        errorCode: 'E-polyfactory-061',
        message: 'Bạn đã đăng ký ca này rồi.',
      };
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        userId,
        workDate,
        shiftNumber,
        type: ScheduleType.SELF_REGISTERED,
      },
    });

    return {
      success: true,
      schedule,
    };
  }

  async cancelShift(userId: string, scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch trực.');
    }

    if (schedule.userId !== userId) {
      throw new ForbiddenException('Bạn không thể hủy ca trực của người khác.');
    }

    // Chặn hủy nếu là ca triệu tập (E-polyfactory-062)
    if (schedule.type === ScheduleType.ASSIGNED) {
      return {
        success: false,
        errorCode: 'E-polyfactory-062',
        message: 'Không thể tự hủy ca trực đã được phân công triệu tập. Vui lòng gửi đơn xin nghỉ.',
      };
    }

    // Kiểm tra mốc 2 tiếng trước ca (E-polyfactory-063)
    const { shiftStartTime } = getShiftStartAndEndTime(schedule.workDate, schedule.shiftNumber);
    if (!isAtLeastTwoHoursBefore(new Date(), shiftStartTime)) {
      return {
        success: false,
        errorCode: 'E-polyfactory-063',
        message: 'Chỉ được tự hủy lịch trước giờ vào ca ít nhất 2 tiếng. Quá hạn vui lòng gửi đơn xin nghỉ.',
      };
    }

    await this.prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return {
      success: true,
      message: 'Đã hủy ca trực thành công.',
    };
  }

  async assignShift(
    assignedById: string,
    targetUserId: string,
    workDateInput: Date | string,
    shiftNumber: number,
  ) {
    const workDate = new Date(workDateInput);

    const existing = await this.prisma.schedule.findFirst({
      where: {
        userId: targetUserId,
        workDate,
        shiftNumber,
      },
    });

    if (existing) {
      return {
        success: false,
        errorCode: 'E-polyfactory-061',
        message: 'Thành viên đã có lịch trong ca này.',
      };
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        userId: targetUserId,
        workDate,
        shiftNumber,
        type: ScheduleType.ASSIGNED,
        assignedById,
      },
    });

    this.eventEmitter.emit('schedule.assigned', {
      schedule,
      targetUserId,
      assignedById,
    });

    return {
      success: true,
      schedule,
    };
  }

  async copyPreviousWeek(userId: string, targetWeekStartInput: Date | string) {
    const targetWeekStart = new Date(targetWeekStartInput);
    const prevWeekStart = new Date(targetWeekStart.getTime() - 7 * 24 * 3600 * 1000);
    const prevWeekEnd = new Date(targetWeekStart.getTime() - 1);

    const oldSchedules = await this.prisma.schedule.findMany({
      where: {
        userId,
        workDate: {
          gte: prevWeekStart,
          lte: prevWeekEnd,
        },
      },
    });

    let copiedCount = 0;

    for (const oldSch of oldSchedules) {
      const targetDate = new Date(oldSch.workDate.getTime() + 7 * 24 * 3600 * 1000);

      // Bỏ qua nếu là ngày nghỉ
      if (this.isHoliday(targetDate)) {
        continue;
      }

      // Bỏ qua nếu còn < 2 tiếng
      const { shiftStartTime } = getShiftStartAndEndTime(targetDate, oldSch.shiftNumber);
      if (!isAtLeastTwoHoursBefore(new Date(), shiftStartTime)) {
        continue;
      }

      // Bỏ qua nếu đã có lịch
      const existing = await this.prisma.schedule.findFirst({
        where: {
          userId,
          workDate: targetDate,
          shiftNumber: oldSch.shiftNumber,
        },
      });

      if (!existing) {
        await this.prisma.schedule.create({
          data: {
            userId,
            workDate: targetDate,
            shiftNumber: oldSch.shiftNumber,
            type: ScheduleType.SELF_REGISTERED,
          },
        });
        copiedCount++;
      }
    }

    return {
      success: true,
      copiedCount,
    };
  }

  async getWeekRoster(startDateInput: Date | string) {
    const startDate = new Date(startDateInput);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 3600 * 1000);

    return this.prisma.schedule.findMany({
      where: {
        workDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        user: { select: { id: true, fullName: true, role: true, avatarUrl: true, teamId: true } },
      },
      orderBy: [{ workDate: 'asc' }, { shiftNumber: 'asc' }],
    });
  }
}
