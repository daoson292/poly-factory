import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AdminPortalService } from './admin-portal.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin')
export class AdminPortalController {
  constructor(private readonly adminPortalService: AdminPortalService) {}

  @Post('login')
  async login(@Body() body: { username: string; pass: string }) {
    return this.adminPortalService.login(body.username, body.pass || (body as any).password);
  }

  @UseGuards(AdminAuthGuard)
  @Get('dashboard/hardware')
  async getHardware() {
    return this.adminPortalService.getHardwareMetrics();
  }

  @UseGuards(AdminAuthGuard)
  @Post('users/:id/adjust-exp')
  async adjustExp(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.adminPortalService.adjustUserExp(req.admin.username, id, body.amount, body.reason);
  }
}
