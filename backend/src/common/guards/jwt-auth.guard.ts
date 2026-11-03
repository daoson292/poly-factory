import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu token xác thực hoặc phiên đăng nhập không hợp lệ');
    }

    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token đã hết hạn hoặc không hợp lệ');
    }

    if (this.prisma && payload.sub) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true, tokenVersion: true },
      });

      if (!dbUser) {
        throw new UnauthorizedException('Tài khoản không tồn tại trong hệ thống');
      }

      if (dbUser.status === 'LOCKED') {
        throw new UnauthorizedException('Tài khoản của bạn đã bị khóa quyền truy cập (LOCKED) (E-polyfactory-002)');
      }

      if (payload.tokenVersion !== undefined && dbUser.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Phiên đăng nhập đã bị vô hiệu hóa (Token version mismatch)');
      }

      request.user = {
        ...payload,
        status: dbUser.status,
        tokenVersion: dbUser.tokenVersion,
      };
      return true;
    }

    request.user = payload;
    return true;
  }
}
