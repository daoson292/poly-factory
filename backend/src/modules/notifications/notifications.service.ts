import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationCategory } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T034: Tạo thông báo mới theo chuyên mục (FR-polyfactory-210)
   */
  async createNotification(
    createdById: string,
    data: {
      title: string;
      content: string;
      category: NotificationCategory;
      targetTeamId?: string;
    },
  ) {
    return this.prisma.notification.create({
      data: {
        createdById,
        title: data.title,
        content: data.content,
        category: data.category,
        targetTeamId: data.targetTeamId || null,
      },
    });
  }

  /**
   * T034: Lấy danh sách popup khẩn cấp chưa xác nhận (FR-polyfactory-211)
   */
  async getUnreadPopups(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    const notifications = await this.prisma.notification.findMany({
      where: {
        category: NotificationCategory.URGENT_POPUP,
        OR: [
          { targetTeamId: null },
          { targetTeamId: user?.teamId ?? undefined },
        ],
        reads: {
          none: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications;
  }

  /**
   * T034: Xác nhận "Đã nắm thông tin" cho thông báo khẩn (FR-polyfactory-212)
   */
  async acknowledgeNotification(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) {
      throw new NotFoundException('Không tìm thấy thông báo.');
    }

    return this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: { notificationId, userId },
      },
      create: {
        notificationId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  /**
   * T034: Lấy danh sách thông báo của tôi (In-App Inbox)
   */
  async getMyNotifications(userId: string, category?: NotificationCategory) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    const where: any = {
      OR: [
        { targetTeamId: null },
        { targetTeamId: user?.teamId ?? undefined },
      ],
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        reads: {
          where: { userId },
        },
      },
    });
  }

  /**
   * T034: Thống kê số lượng thành viên đã đọc thông báo khẩn
   */
  async getNotificationReadStats(notificationId: string) {
    const count = await this.prisma.notificationRead.count({
      where: { notificationId },
    });

    return {
      notificationId,
      readCount: count,
    };
  }
}
