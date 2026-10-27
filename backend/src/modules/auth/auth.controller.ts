import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddWhitelistMemberDto, ImportWhitelistMemberItemDto } from './dto/whitelist-member.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google/callback')
  async googleAuthCallback(@Body() body: { email: string; fullName: string; avatarUrl?: string }) {
    return this.authService.validateGoogleUser(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any) {
    return this.authService.logoutAllDevices(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('whitelist')
  async addWhitelist(@Body() dto: AddWhitelistMemberDto, @Req() req: any) {
    return this.authService.addMemberToWhitelist(dto, {
      id: req.user.sub,
      role: req.user.role,
      teamId: req.user.teamId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('whitelist/import-preview')
  async previewImport(@Body() body: { rows: ImportWhitelistMemberItemDto[] }, @Req() req: any) {
    return this.authService.previewWhitelistImport(body.rows || [], {
      id: req.user.sub,
      role: req.user.role,
      teamId: req.user.teamId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('whitelist/import-confirm')
  async confirmImport(@Body() body: { rows: ImportWhitelistMemberItemDto[] }, @Req() req: any) {
    return this.authService.confirmWhitelistImport(body.rows || [], {
      id: req.user.sub,
      role: req.user.role,
      teamId: req.user.teamId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    return req.user;
  }
}
