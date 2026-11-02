import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  async getAttendance(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reportsService.getAttendanceReport(new Date(startDate), new Date(endDate));
  }
}
