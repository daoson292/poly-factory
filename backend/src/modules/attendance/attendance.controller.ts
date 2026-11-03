import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('sessions')
  async createSession(
    @Req() req: any,
    @Body()
    body: {
      shiftNumber: number;
      isEvent?: boolean;
      stepSeconds?: number;
      expReward?: number;
      cosmeticRewardId?: string;
    },
  ) {
    return this.attendanceService.createSession(req.user.sub || req.user.id, body);
  }

  @Post('scan')
  async scan(
    @Req() req: any,
    @Body()
    body: {
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
    return this.attendanceService.scanCheckIn(req.user.sub || req.user.id, body);
  }

  @Post('check-in')
  async checkIn(
    @Req() req: any,
    @Body()
    body: {
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
    return this.attendanceService.scanCheckIn(req.user.sub || req.user.id, body);
  }

  @Post('manual')
  async manual(
    @Req() req: any,
    @Body()
    body: {
      userId: string;
      scheduleId?: string;
      sessionId?: string;
      isEvent?: boolean;
      lateMinutes?: number;
    },
  ) {
    return this.attendanceService.manualCheckIn(req.user.sub || req.user.id, body);
  }

  @Post('adjustment')
  async adjustment(
    @Req() req: any,
    @Body() body: { scheduleId: string },
  ) {
    return this.attendanceService.adjustmentCheckIn(req.user.sub || req.user.id, body.scheduleId);
  }

  @Post('close-shift')
  async closeShift(
    @Body() body: { workDate: string; shiftNumber: number },
  ) {
    return this.attendanceService.closeShiftAutomatically(body.workDate, body.shiftNumber);
  }
}
