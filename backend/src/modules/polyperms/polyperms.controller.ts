import { Controller, Post, Delete, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PolyPermsService } from './polyperms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PolyPermsGuard } from '../../common/guards/polyperms.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';

@Controller('polyperms')
export class PolyPermsController {
  constructor(private readonly polyPermsService: PolyPermsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-permissions')
  async getMyPermissions(@Req() req: any) {
    const permissions = await this.polyPermsService.getUserPermissions(req.user.sub || req.user.id);
    return { permissions };
  }

  @UseGuards(JwtAuthGuard, PolyPermsGuard)
  @RequirePerm('attendance.qr.delegate')
  @Post('delegate-shift-today')
  async delegateShiftToday(@Body() body: { targetUserId: string }, @Req() req: any) {
    return this.polyPermsService.delegateShiftToday(
      {
        id: req.user.sub || req.user.id,
        role: req.user.role,
        teamId: req.user.teamId,
      },
      body.targetUserId,
    );
  }

  @UseGuards(JwtAuthGuard, PolyPermsGuard)
  @RequirePerm('attendance.qr.delegate')
  @Delete('delegate-shift-today/:targetUserId')
  async revokeShiftDelegation(@Param('targetUserId') targetUserId: string, @Req() req: any) {
    return this.polyPermsService.revokeShiftDelegation(
      {
        id: req.user.sub || req.user.id,
        role: req.user.role,
        teamId: req.user.teamId,
      },
      targetUserId,
    );
  }
}
