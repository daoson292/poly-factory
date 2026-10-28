import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationCategory } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      content: string;
      category: NotificationCategory;
      targetTeamId?: string;
    },
  ) {
    return this.notificationsService.createNotification(req.user.sub, body);
  }

  @Get('unread-popups')
  async getUnreadPopups(@Req() req: any) {
    return this.notificationsService.getUnreadPopups(req.user.sub);
  }

  @Get('urgent-popup')
  async getUrgentPopup(@Req() req: any) {
    return this.notificationsService.getUnreadPopups(req.user.sub);
  }

  @Post(':id/acknowledge')
  async acknowledge(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.acknowledgeNotification(req.user.sub, id);
  }

  @Post(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.acknowledgeNotification(req.user.sub, id);
  }

  @Get('inbox')
  async getMyNotifications(@Req() req: any, @Query('category') category?: NotificationCategory) {
    return this.notificationsService.getMyNotifications(req.user.sub, category);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.notificationsService.getNotificationReadStats(id);
  }
}
