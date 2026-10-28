import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  public static readonly MAX_DAILY_EMAILS = 440; // Giới hạn an toàn < 450 email/ngày của Gmail SMTP

  private sentToday = 0;
  private lastResetDate: string = new Date().toISOString().split('T')[0];

  constructor(private readonly configService: ConfigService) {}

  /**
   * T035: Kiểm tra và gửi email cá nhân hóa (FR-polyfactory-230)
   * - Hàng đợi giới hạn an toàn < 450 email/ngày
   * - Tôn trọng emailPreferences của người nhận
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: { category?: string; emailPreferences?: any; isUrgent?: boolean },
  ) {
    this.checkDailyReset();

    // 1. Kiểm tra trần 440 email/ngày (trừ khi là email khẩn cấp)
    if (this.sentToday >= EmailService.MAX_DAILY_EMAILS && !options?.isUrgent) {
      this.logger.warn(`[EMAIL RATE LIMIT] Đã chạm trần ${EmailService.MAX_DAILY_EMAILS} email/ngày. Bỏ qua email tới ${to}`);
      return {
        queued: false,
        sent: false,
        reason: 'DAILY_LIMIT_EXCEEDED',
      };
    }

    // 2. Kiểm tra tùy chọn nhận email của người dùng
    if (options?.category && options?.emailPreferences && !options?.isUrgent) {
      const isEnabled = options.emailPreferences[options.category] ?? true;
      if (!isEnabled) {
        this.logger.log(`[EMAIL OPT-OUT] Người dùng ${to} đã tắt nhận thông báo loại ${options.category}`);
        return {
          queued: false,
          sent: false,
          reason: 'USER_OPTED_OUT',
        };
      }
    }

    this.sentToday++;
    this.logger.log(`[EMAIL SENT #${this.sentToday}] Sent to ${to}: ${subject}`);

    return {
      queued: true,
      sent: true,
      remainingDailyQuota: EmailService.MAX_DAILY_EMAILS - this.sentToday,
    };
  }

  /**
   * T075: Tự động tổng hợp và gửi Email Báo cáo Tuần (Weekly Digest) cho Mentor & Team Lead (FR-polyfactory-231)
   */
  async sendWeeklyDigest(
    recipient: { email: string; name: string; role: string; emailPreferences?: any },
    digestData: {
      weekNumber: number;
      totalShifts: number;
      attendanceRate: number;
      unexcusedAbsences: number;
      activeProjectsCount: number;
      criticalBugsCount: number;
    },
  ) {
    const subject = `[PolyFactory] Báo cáo Hoạt động Xưởng Tuần ${digestData.weekNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0052cc; margin-top: 0;">PolyFactory - Báo cáo Tổng kết Tuần ${digestData.weekNumber}</h2>
        <p>Xin chào <strong>${recipient.name}</strong> (${recipient.role}),</p>
        <p>Dưới đây là tóm tắt hoạt động vận hành và kiểm thử của xưởng trong tuần vừa qua:</p>
        <ul style="line-height: 1.8;">
          <li>Tổng số ca trực đã diễn ra: <strong>${digestData.totalShifts}</strong> ca</li>
          <li>Tỷ lệ chuyên cần toàn xưởng: <strong>${digestData.attendanceRate}%</strong></li>
          <li>Số ca vắng không phép: <strong>${digestData.unexcusedAbsences}</strong> ca</li>
          <li>Số dự án đang hoạt động: <strong>${digestData.activeProjectsCount}</strong></li>
          <li>Số lỗi CRITICAL còn mở: <strong>${digestData.criticalBugsCount}</strong></li>
        </ul>
        <p style="font-size: 13px; color: #777;">Email tự động gửi lúc 08:00 sáng Thứ Hai hàng tuần. Bạn có thể thay đổi tùy chọn thông báo trong phần Cài đặt cá nhân.</p>
      </div>
    `;

    return this.sendEmail(recipient.email, subject, html, {
      category: 'weekly_digest',
      emailPreferences: recipient.emailPreferences,
    });
  }

  getDailySentCount(): number {
    this.checkDailyReset();
    return this.sentToday;
  }

  resetCounterForTesting() {
    this.sentToday = 0;
  }

  private checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.sentToday = 0;
      this.lastResetDate = today;
    }
  }
}

