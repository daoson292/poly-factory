import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Yêu cầu tài khoản Quản trị viên Admin Portal');
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = this.configService.get<string>(
        'ADMIN_JWT_SECRET',
        'super_secret_admin_jwt_key_polyfactory_2026',
      );
      const payload = this.jwtService.verify(token, { secret });
      if (!payload.adminRole) {
        throw new UnauthorizedException('Tài khoản không có quyền truy cập Admin Portal');
      }

      // VIEWER chỉ được phép xem (GET/HEAD), chặn các tác vụ ghi dữ liệu (POST/PUT/PATCH/DELETE)
      const method = request.method?.toUpperCase();
      if (payload.adminRole === 'VIEWER' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-253',
          message: 'Tài khoản quyền VIEWER chỉ được phép xem dữ liệu và nhật ký, không được chỉnh sửa hệ thống.',
        });
      }

      request.admin = payload;
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Phiên đăng nhập Admin Portal không hợp lệ hoặc đã hết hạn');
    }
  }
}
