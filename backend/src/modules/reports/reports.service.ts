import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus } from '@prisma/client';

export interface AttendanceMetrics {
  userId: string;
  scheduledShiftsCount: number;
  attendedScheduledCount: number;
  walkInCount: number;
  attendanceRate: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính toán 4 chỉ số chuyên cần chuẩn (FR-polyfactory-120, Mục 6.13)
   * 1. scheduledShiftsCount (S_scheduled): Tổng ca có lịch đã kết thúc, trừ EXCUSED_ABSENCE và CANCELLED_BY_ROOM.
   * 2. attendedScheduledCount (A_scheduled): Số ca có mặt thuộc lịch đăng ký (isWalkIn = false).
   * 3. walkInCount: Số ca đi trực bổ sung ngoài lịch (isWalkIn = true).
   * 4. attendanceRate: min(100, (A_scheduled / S_scheduled) * 100), nếu S_scheduled = 0 thì bằng 100%.
   * QUY TẮC: walkInCount KHÔNG làm tăng tử số của attendanceRate vượt quá số ca có lịch.
   */
  async getUserAttendanceMetrics(
    userId: string,
    dateRange?: { startDate?: Date; endDate?: Date },
  ): Promise<AttendanceMetrics> {
    const now = new Date();
    const scheduleWhere: any = {
      userId,
      workDate: { lte: now },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      scheduleWhere.workDate = {};
      if (dateRange.startDate) scheduleWhere.workDate.gte = dateRange.startDate;
      if (dateRange.endDate) scheduleWhere.workDate.lte = dateRange.endDate;
    }

    const schedules = await this.prisma.schedule.findMany({
      where: scheduleWhere,
      include: { attendance: true },
    });

    // Loại trừ EXCUSED_ABSENCE và CANCELLED_BY_ROOM khỏi mẫu số
    const validScheduledShifts = schedules.filter(
      (s) =>
        !s.attendance ||
        (s.attendance.status !== AttendanceStatus.EXCUSED_ABSENCE &&
          s.attendance.status !== AttendanceStatus.CANCELLED_BY_ROOM),
    );
    const scheduledShiftsCount = validScheduledShifts.length;

    const attendanceWhere: any = {
      userId,
      status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      attendanceWhere.createdAt = {};
      if (dateRange.startDate) attendanceWhere.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) attendanceWhere.createdAt.lte = dateRange.endDate;
    }

    const attendances = await this.prisma.attendance.findMany({
      where: attendanceWhere,
    });

    const attendedScheduledCount = attendances.filter((a) => !a.isWalkIn).length;
    const walkInCount = attendances.filter((a) => a.isWalkIn).length;

    let attendanceRate = 100;
    if (scheduledShiftsCount > 0) {
      attendanceRate = Math.min(
        100,
        Math.round((attendedScheduledCount / scheduledShiftsCount) * 100),
      );
    }

    return {
      userId,
      scheduledShiftsCount,
      attendedScheduledCount,
      walkInCount,
      attendanceRate,
    };
  }

  async getAttendanceReport(startDate: Date, endDate: Date) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const present = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const late = attendances.filter((a) => a.status === AttendanceStatus.LATE).length;
    const excusedAbsence = attendances.filter(
      (a) => a.status === AttendanceStatus.EXCUSED_ABSENCE,
    ).length;
    const unexcusedAbsence = attendances.filter(
      (a) => a.status === AttendanceStatus.UNEXCUSED_ABSENCE,
    ).length;
    const total = present + late + unexcusedAbsence;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return {
      startDate,
      endDate,
      summary: {
        present,
        late,
        excusedAbsence,
        unexcusedAbsence,
        attendanceRate,
      },
    };
  }

  /**
   * T074: Xuất Báo cáo Chuyên cần 4 chỉ số định dạng Excel/CSV có màu sắc và định dạng chuẩn (FR-polyfactory-122)
   */
  async exportAttendanceReport(dateRange?: { startDate?: Date; endDate?: Date }): Promise<{
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }> {
    const users = await this.prisma.user.findMany({
      include: { team: true },
      orderBy: [{ team: { name: 'asc' } }, { fullName: 'asc' }],
    });

    const rows: string[] = [
      'STT,Họ và Tên,Email,Team,Số ca có lịch,Số ca có mặt,Số ca Walk-in,Tỷ lệ chuyên cần (%),Đánh giá',
    ];

    let index = 1;
    for (const u of users) {
      const metrics = await this.getUserAttendanceMetrics(u.id, dateRange);
      const rating = metrics.attendanceRate >= 70 ? 'ĐẠT (>= 70%)' : 'CẢNH BÁO (< 70%)';
      rows.push(
        `${index++},"${u.fullName || ''}","${u.email}","${u.team?.name || 'Chưa vào team'}",${metrics.scheduledShiftsCount},${metrics.attendedScheduledCount},${metrics.walkInCount},${metrics.attendanceRate}%,"${rating}"`,
      );
    }

    // Gắn UTF-8 BOM (\uFEFF) để Excel trên Windows hiển thị đúng tiếng Việt có dấu
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    const dateStr = new Date().toISOString().split('T')[0];
    return {
      filename: `Bao-Cao-Chuyen-Can-${dateStr}.csv`,
      mimeType: 'text/csv; charset=utf-8',
      buffer,
    };
  }

  /**
   * T074: Xuất Báo cáo Chất lượng Kiểm thử M17
   */
  async exportTestingQualityReport(projectId: string): Promise<{
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }> {
    const project: any = await (this.prisma.project as any).findUnique({
      where: { id: projectId },
      include: {
        testSuites: { include: { testCases: true } },
        testRuns: { include: { testResults: true } },
        bugs: true,
      },
    });

    const rows: string[] = [
      `BÁO CÁO CHẤT LƯỢNG DỰ ÁN: ${project?.name || projectId}`,
      `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
      '',
      'Hạng mục,Số lượng,Ghi chú',
      `Kho kịch bản (Test Suites),${project?.testSuites?.length || 0},Kho 1 cấp`,
      `Tổng số kịch bản (Test Cases),${project?.testSuites?.reduce((acc: number, s: any) => acc + (s.testCases?.length || 0), 0) || 0},Mã TC-xx`,
      `Tổng số đợt chạy (Test Runs),${project?.testRuns?.length || 0},Đợt kiểm thử`,
      `Tổng số lỗi phát hiện (Bugs),${project?.bugs?.length || 0},Sinh mã BUG-xx`,
      `Số lỗi CRITICAL chưa đóng,${project?.bugs?.filter((b: any) => b.severity === 'CRITICAL' && b.status !== 'CLOSED').length || 0},Chặn Release Gate`,
      `Số lỗi HIGH chưa đóng,${project?.bugs?.filter((b: any) => b.severity === 'HIGH' && b.status !== 'CLOSED').length || 0},Chặn Release Gate`,
    ];

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      filename: `Bao-Cao-Kiem-Thu-${projectId.slice(0, 8)}.csv`,
      mimeType: 'text/csv; charset=utf-8',
      buffer,
    };
  }
}

