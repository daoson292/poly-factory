import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoomStatus } from '@prisma/client';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('current')
  async getCurrentStatus() {
    return this.roomsService.getCurrentStatus();
  }

  @Get('status')
  async getStatus() {
    return this.roomsService.getCurrentStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Post('status')
  async updateStatus(
    @Body() body: { status: RoomStatus; tempRoom?: string; reason?: string; revertAt?: Date },
    @Req() req: any,
  ) {
    return this.roomsService.updateStatus(req.user.sub || req.user.id, body);
  }
}
