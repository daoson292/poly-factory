import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ZaloMiniAppService {
  // Bộ nhớ tạm lưu mã 6 chữ số: code -> { userId, expiresAt }
  private linkCodes = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  generateLinkCode(userId: string): { code: string; expiresInSeconds: number } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

    this.linkCodes.set(code, { userId, expiresAt });
    return { code, expiresInSeconds: 600 };
  }

  async verifyAndLinkZalo(code: string, zaloUserId: string) {
    const entry = this.linkCodes.get(code);

    if (!entry || Date.now() > entry.expiresAt) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-282',
        message: 'Mã liên kết Zalo không chính xác hoặc đã hết hạn (quá 10 phút).',
      });
    }

    // Gắn cứng Zalo User ID vào tài khoản Workspace
    const user = await this.prisma.user.update({
      where: { id: entry.userId },
      data: { zaloUserId },
    });

    this.linkCodes.delete(code);

    // Ký token đăng nhập
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return { success: true, accessToken, user };
  }

  async autoLogin(zaloUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { zaloUserId },
    });

    if (!user) {
      return { linked: false };
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return { linked: true, accessToken, user };
  }
}
