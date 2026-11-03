import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ZaloMiniAppService } from './zalo-miniapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('zalo')
export class ZaloMiniAppController {
  constructor(private readonly zaloService: ZaloMiniAppService) {}

  @UseGuards(JwtAuthGuard)
  @Post('link-code')
  async getLinkCode(@Req() req: any) {
    return this.zaloService.generateLinkCode(req.user.sub);
  }

  @Post('verify-link')
  async verifyLink(@Body() body: { code: string; zaloUserId: string }) {
    return this.zaloService.verifyAndLinkZalo(body.code, body.zaloUserId);
  }

  @Post('link')
  async link(@Body() body: { code: string; zaloUserId: string }) {
    return this.zaloService.verifyAndLinkZalo(body.code, body.zaloUserId);
  }

  @Post('auto-login')
  async autoLogin(@Body() body: { zaloUserId: string }) {
    return this.zaloService.autoLogin(body.zaloUserId);
  }
}
