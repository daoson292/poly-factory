import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus } from '@prisma/client';

export interface DuolingoWarning {
  userId: string;
  email: string;
  fullName: string;
  weeklyMisses: number;
  monthlyMisses: number;
  message: string;
}

@Injectable()
export class DuolingoRemindersService {
  private readonly logger = new Logger('DuolingoRemindersService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * T035: Lời nhắc 30 phút trước ca trực
   */
  generateShiftReminder(userName: string, shiftNumber: number, timeStr: string) {
    return {
      title: '🦉 Cú Duo nhắc nhở ca trực!',
      body: `Chào ${userName}, còn 30 phút nữa là tới Ca ${shiftNumber} (${timeStr}) rồi! Mau chuẩn bị máy móc lên xưởng điểm danh nha, đừng để đứt streak nhé!`,
    };
  }

  /**
   * T035: Lời nhắc tối Chủ nhật đăng ký lịch tuần mới
   */
  generateSundayScheduleReminder(userName: string) {
    return {
      title: '🦉 Tối Chủ nhật rồi, xếp lịch thôi!',
      body: `Chào ${userName}, tuần mới sắp bắt đầu! Hãy mở PolyFactory và đăng ký các ca trực tuần này ngay trước khi hết slot nhé!`,
    };
  }

  /**
   * T035: Quét và cảnh báo thành viên vắng 3 ca trong tuần hoặc 3 ca trong tháng (BR-polyfactory-241)
   */
  async checkWeeklyAndMonthlyMisses(now: Date = new Date()): Promise<DuolingoWarning[]> {
    // Đầu tuần (Thứ Hai 00:00:00)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Đầu tháng (Ngày 1 00:00:00)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const unexcusedAttendances = await this.prisma.attendance.findMany({
      where: {
        status: AttendanceStatus.UNEXCUSED_ABSENCE,
        createdAt: { gte: firstDayOfMonth },
      },
      include: {
        user: true,
      },
    });

    const userMap = new Map<string, { user: any; weeklyCount: number; monthlyCount: number }>();

    for (const att of unexcusedAttendances) {
      if (!att.user) continue;
      const existing = userMap.get(att.userId) || { user: att.user, weeklyCount: 0, monthlyCount: 0 };

      existing.monthlyCount++;
      if (new Date(att.createdAt) >= monday) {
        existing.weeklyCount++;
      }

      userMap.set(att.userId, existing);
    }

    const warnings: DuolingoWarning[] = [];

    for (const [userId, data] of userMap.entries()) {
      if (data.weeklyCount >= 3 || data.monthlyCount >= 3) {
        const reason =
          data.weeklyCount >= 3
            ? `vắng ${data.weeklyCount} ca trong tuần này`
            : `vắng ${data.monthlyCount} ca trong tháng này`;

        const message = `🦉 Cú Duo đang khóc ròng: Bạn đã ${reason}! Phong ấn Tag Xấu 'Vua Trốn Học' sắp giáng xuống rồi đấy, hãy lên xưởng trực ca để cứu chuỗi ngay!`;

        warnings.push({
          userId,
          email: data.user.email,
          fullName: data.user.fullName,
          weeklyMisses: data.weeklyCount,
          monthlyMisses: data.monthlyCount,
          message,
        });

        this.logger.warn(`[DUOLINGO ALERT] ${data.user.email}: ${reason}`);
      }
    }

    return warnings;
  }
}

// Enforce Asia/Ho_Chi_Minh timezone lock on daily streak cron (fixes #8)
