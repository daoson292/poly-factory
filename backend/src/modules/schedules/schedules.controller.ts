import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('roster')
  async getRoster(@Query('startDate') startDate: string) {
    return this.schedulesService.getWeekRoster(startDate || new Date().toISOString());
  }

  @Post('register')
  async registerShift(
    @Body() body: { workDate: string; shiftNumber: number },
    @Req() req: any,
  ) {
    return this.schedulesService.registerShift(
      req.user.sub || req.user.id,
      body.workDate,
      body.shiftNumber,
    );
  }

  @Delete(':id')
  async cancelShift(@Param('id') id: string, @Req() req: any) {
    return this.schedulesService.cancelShift(req.user.sub || req.user.id, id);
  }

  @Post('assign')
  async assignShift(
    @Body() body: { targetUserId: string; workDate: string; shiftNumber: number },
    @Req() req: any,
  ) {
    return this.schedulesService.assignShift(
      req.user.sub || req.user.id,
      body.targetUserId,
      body.workDate,
      body.shiftNumber,
    );
  }

  @Post('copy-last-week')
  async copyLastWeek(
    @Body() body: { targetWeekStart: string },
    @Req() req: any,
  ) {
    return this.schedulesService.copyPreviousWeek(
      req.user.sub || req.user.id,
      body.targetWeekStart,
    );
  }

  @Get('holidays')
  async getHolidays() {
    return this.schedulesService.getHolidays();
  }

  @Post('holidays')
  async addHoliday(@Body() body: { date: string; name: string }) {
    return this.schedulesService.addHoliday(body.date, body.name);
  }

  @Delete('holidays/:date')
  async removeHoliday(@Param('date') date: string) {
    return this.schedulesService.removeHoliday(date);
  }
}
