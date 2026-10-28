import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  GpsStatus,
  CheckInMethod,
  AttendanceStatus,
  SessionStatus,
  TicketStatus,
  TicketType,
} from '@prisma/client';
import { authenticator } from 'otplib';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getShiftStartAndEndTime } from '../schedules/shift-time.util';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSession(
    leadId: string,
    data: {
      shiftNumber: number;
      isEvent?: boolean;
      stepSeconds?: number;
      expReward?: number;
      cosmeticRewardId?: string;
    },
  ) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const todayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 3600_000);

    // Kiểm tra không mở trùng phiên đang ACTIVE trong cùng ca (E-polyfactory-080)
    const existing = await this.prisma.attendanceSession.findFirst({
      where: {
        shiftNumber: data.shiftNumber,
        status: SessionStatus.ACTIVE,
        sessionDate: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        errorCode: 'E-polyfactory-080',
        message: 'Đã có phiên điểm danh QR đang mở cho ca trực này.',
      };
    }

    const stepSeconds = data.stepSeconds && [10, 20, 30].includes(data.stepSeconds)
      ? data.stepSeconds
      : 10;

    const secretKey = authenticator.generateSecret();

    const session = await this.prisma.attendanceSession.create({
      data: {
        createdById: leadId,
        sessionDate: todayStart,
        shiftNumber: data.shiftNumber,
        isEvent: data.isEvent ?? false,
        stepSeconds,
        secretKey,
        expReward: data.expReward ?? (data.isEvent ? 20 : 10),
        cosmeticRewardId: data.cosmeticRewardId || null,
        status: SessionStatus.ACTIVE,
      },
    });

    return {
      success: true,
      session,
      secretKey,
    };
  }

  async scanCheckIn(
    userId: string,
    data: {
      sessionId?: string;
      qrToken?: string;
      totpToken?: string;
      deviceToken?: string;
      deviceId?: string;
      lat?: number;
      latitude?: number;
      lng?: number;
      longitude?: number;
    },
  ) {
    const qrToken = data.qrToken || data.totpToken || '';
    const deviceToken = data.deviceToken || data.deviceId || `device_${userId}`;
    const lat = data.lat !== undefined ? data.lat : data.latitude;
    const lng = data.lng !== undefined ? data.lng : data.longitude;

    let session: any = null;
    if (data.sessionId) {
      session = await this.prisma.attendanceSession.findUnique({
        where: { id: data.sessionId },
      });
    } else {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const todayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const todayEnd = new Date(todayStart.getTime() + 24 * 3600_000);
      session = await this.prisma.attendanceSession.findFirst({
        where: {
          status: SessionStatus.ACTIVE,
          sessionDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 1. Kiểm tra phiên ACTIVE (E-polyfactory-086)
    if (!session || session.status !== SessionStatus.ACTIVE) {
      return {
        success: false,
        errorCode: 'E-polyfactory-086',
        message: 'Phiên điểm danh đã kết thúc hoặc không tồn tại.',
      };
    }

    // 2. Nếu là phiên sự kiện, khóa sau 15 phút (E-polyfactory-085)
    if (session.isEvent) {
      const elapsedMin = (Date.now() - new Date(session.createdAt).getTime()) / 60_000;
      if (elapsedMin > 15) {
        return {
          success: false,
          errorCode: 'E-polyfactory-085',
          message:
            'Phiên QR sự kiện đã tự động khóa sau 15 phút. Vui lòng liên hệ Lead để điểm danh tay.',
        };
      }
    }

    // 3. Xác thực mã QR bằng otplib (E-polyfactory-081)
    authenticator.options = { step: session.stepSeconds, window: 1 };
    const isValidToken = authenticator.check(qrToken, session.secretKey);
    if (!isValidToken) {
      return {
        success: false,
        errorCode: 'E-polyfactory-081',
        message:
          'Mã QR không hợp lệ hoặc đã hết hạn. Vui lòng quét lại mã mới nhất trên màn hình.',
      };
    }

    // 4. Kiểm tra quét trùng (E-polyfactory-082)
    const existingScan = await this.prisma.attendance.findFirst({
      where: {
        sessionId: session.id,
        userId,
      },
    });
    if (existingScan) {
      return {
        success: false,
        errorCode: 'E-polyfactory-082',
        message: 'Bạn đã điểm danh trong ca này rồi.',
      };
    }

    // 5. Kiểm tra khóa thiết bị 1 máy / 1 ca (E-polyfactory-083)
    const existingDevice = await this.prisma.attendance.findFirst({
      where: {
        sessionId: session.id,
        deviceToken,
        userId: { not: userId },
      },
    });
    if (existingDevice) {
      return {
        success: false,
        errorCode: 'E-polyfactory-083',
        message:
          'Thiết bị này đã được sử dụng để điểm danh cho một thành viên khác trong ca trực này.',
      };
    }

    // 6. Tính khoảng cách Haversine tới P407 (21.0381, 105.7468)
    let gpsStatus: GpsStatus = GpsStatus.RED;
    let gpsDistance = 9999;
    if (lat !== undefined && lng !== undefined) {
      gpsDistance = this.calculateDistance(lat, lng, 21.0381, 105.7468);
      if (gpsDistance <= 150) {
        gpsStatus = GpsStatus.GREEN;
      }
    }

    // 7. Tính EXP và trạng thái điểm danh (T025, CD-03, CD-04)
    const sessionDateStart = new Date(session.sessionDate);
    const sessionDateEnd = new Date(sessionDateStart.getTime() + 24 * 3600_000);

    const matchingSchedule = await this.prisma.schedule.findFirst({
      where: {
        userId,
        shiftNumber: session.shiftNumber,
        workDate: {
          gte: sessionDateStart,
          lt: sessionDateEnd,
        },
      },
    });

    const isWalkIn = !matchingSchedule;
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    let expEarned = 0;

    if (isWalkIn) {
      // Đi ngoài lịch -> +0 EXP
      status = AttendanceStatus.PRESENT;
      expEarned = 0;
    } else {
      // Có lịch hợp lệ
      if (session.isEvent) {
        status = AttendanceStatus.PRESENT;
        expEarned = session.expReward;
      } else {
        // Ca thường: tính deltaMinutes từ giờ vào ca
        let deltaMinutes = 0;
        try {
          const { shiftStartTime } = getShiftStartAndEndTime(
            matchingSchedule.workDate,
            matchingSchedule.shiftNumber,
          );
          deltaMinutes = Math.floor((Date.now() - shiftStartTime.getTime()) / 60_000);
        } catch {
          deltaMinutes = 0;
        }

        // Kiểm tra xem có đơn LATE được duyệt không
        const approvedLateTicket = await this.prisma.leaveTicket.findFirst({
          where: {
            userId,
            scheduleId: matchingSchedule.id,
            ticketType: TicketType.LATE,
            status: TicketStatus.APPROVED,
          },
        });

        // Nếu quét trong vòng 15 phút từ đầu ca (hoặc trước ca) hoặc có đơn LATE duyệt
        if (deltaMinutes <= 15 || approvedLateTicket) {
          status = AttendanceStatus.PRESENT;
          expEarned = 10;
        } else {
          // Đi trễ > 15 phút
          status = AttendanceStatus.LATE;
          const mLate = deltaMinutes - 15;
          const k = Math.ceil(mLate / 5);
          expEarned = Math.max(0, 10 - 2 * k);
        }
      }
    }

    // 8. Lưu bản ghi điểm danh
    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        sessionId: session.id,
        scheduleId: matchingSchedule?.id || null,
        isWalkIn,
        status,
        checkInTime: new Date(),
        checkInMethod: CheckInMethod.QR_SCAN,
        gpsStatus,
        gpsDistance,
        deviceToken,
      },
    });

    // 9. Cập nhật lastCheckinAt trên User
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastCheckinAt: new Date() },
    });

    // 10. Phát sự kiện có mặt hợp lệ (để gỡ phong ấn & cộng EXP)
    this.eventEmitter.emit('attendance.present', {
      userId,
      scheduleId: matchingSchedule?.id || null,
      status,
      expEarned,
      isWalkIn,
      cosmeticRewardId: session.cosmeticRewardId,
      workDate: session.sessionDate,
    });

    return {
      success: true,
      attendance,
      expEarned,
      status,
      gpsStatus,
      gpsDistance,
      isWalkIn,
    };
  }

  async manualCheckIn(
    leadId: string,
    data: {
      userId: string;
      scheduleId?: string;
      sessionId?: string;
      isEvent?: boolean;
      lateMinutes?: number;
    },
  ) {
    const isEvent = data.isEvent ?? false;
    let expEarned = 0;
    let penalty = 0;

    if (isEvent && data.lateMinutes && data.lateMinutes > 15) {
      const k = Math.ceil((data.lateMinutes - 15) / 5);
      penalty = 2 * k; // Phạt -2 EXP mỗi 5 phút trễ
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        userId: data.userId,
        scheduleId: data.scheduleId || null,
        sessionId: data.sessionId || null,
        isWalkIn: !data.scheduleId,
        status: AttendanceStatus.PRESENT,
        checkInTime: new Date(),
        checkInMethod: CheckInMethod.LEAD_MANUAL,
        approvedById: leadId,
      },
    });

    this.eventEmitter.emit('attendance.present', {
      userId: data.userId,
      scheduleId: data.scheduleId || null,
      status: AttendanceStatus.PRESENT,
      expEarned: 0,
      penalty,
      isWalkIn: !data.scheduleId,
    });

    return {
      success: true,
      attendance,
      expEarned: 0,
      penalty,
    };
  }

  async adjustmentCheckIn(leadId: string, scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch trực để điểm danh bù.');
    }

    // Kiểm tra mốc 7 ngày (E-polyfactory-087)
    const diffDays =
      (Date.now() - new Date(schedule.workDate).getTime()) / (24 * 3600_000);
    if (diffDays > 7) {
      return {
        success: false,
        errorCode: 'E-polyfactory-087',
        message: 'Đã quá hạn 7 ngày để điểm danh bù cho ca trực này.',
      };
    }

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: { scheduleId },
    });

    let attendance: any;
    let restoredPenalty = false;

    if (existingAttendance) {
      if (existingAttendance.status === AttendanceStatus.UNEXCUSED_ABSENCE) {
        restoredPenalty = true;
      }
      attendance = await this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: AttendanceStatus.PRESENT,
          checkInMethod: CheckInMethod.ADJUSTMENT,
          approvedById: leadId,
          checkInTime: new Date(),
        },
      });
    } else {
      attendance = await this.prisma.attendance.create({
        data: {
          userId: schedule.userId,
          scheduleId: schedule.id,
          status: AttendanceStatus.PRESENT,
          checkInMethod: CheckInMethod.ADJUSTMENT,
          approvedById: leadId,
          checkInTime: new Date(),
          isWalkIn: false,
        },
      });
    }

    this.eventEmitter.emit('attendance.present', {
      userId: schedule.userId,
      scheduleId: schedule.id,
      status: AttendanceStatus.PRESENT,
      expEarned: 0,
      restoredPenalty,
      isWalkIn: false,
    });

    return {
      success: true,
      attendance,
      restoredPenalty,
    };
  }

  async closeShiftAutomatically(workDateInput: Date | string, shiftNumber: number) {
    const workDate = new Date(workDateInput);
    const dateStr = workDate.toISOString().split('T')[0];
    const dateStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dateEnd = new Date(dateStart.getTime() + 24 * 3600_000);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        shiftNumber,
        workDate: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      include: {
        attendance: true,
        leaveTickets: true,
      },
    });

    const results = {
      excusedCount: 0,
      waitingReviewCount: 0,
      unexcusedCount: 0,
    };

    for (const sch of schedules) {
      if (
        sch.attendance &&
        (sch.attendance.status === AttendanceStatus.PRESENT ||
          sch.attendance.status === AttendanceStatus.LATE ||
          sch.attendance.status === AttendanceStatus.CANCELLED_BY_ROOM)
      ) {
        continue;
      }

      const approvedTicket = sch.leaveTickets.find(
        (t) => t.status === TicketStatus.APPROVED,
      );
      const pendingTicket = sch.leaveTickets.find(
        (t) => t.status === TicketStatus.PENDING,
      );

      let finalStatus: AttendanceStatus;

      if (approvedTicket) {
        finalStatus = AttendanceStatus.EXCUSED_ABSENCE;
        results.excusedCount++;
      } else if (pendingTicket) {
        finalStatus = AttendanceStatus.WAITING_TICKET_REVIEW;
        results.waitingReviewCount++;
      } else {
        finalStatus = AttendanceStatus.UNEXCUSED_ABSENCE;
        results.unexcusedCount++;
      }

      if (sch.attendance) {
        await this.prisma.attendance.update({
          where: { id: sch.attendance.id },
          data: { status: finalStatus },
        });
      } else {
        await this.prisma.attendance.create({
          data: {
            userId: sch.userId,
            scheduleId: sch.id,
            status: finalStatus,
            isWalkIn: false,
          },
        });
      }

      if (finalStatus === AttendanceStatus.UNEXCUSED_ABSENCE) {
        this.eventEmitter.emit('attendance.unexcused_absence', {
          userId: sch.userId,
          scheduleId: sch.id,
          workDate: sch.workDate,
        });
      }
    }

    return {
      success: true,
      results,
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }
}
