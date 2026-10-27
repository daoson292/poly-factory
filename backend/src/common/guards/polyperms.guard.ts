import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-perm.decorator';
import { PolyPermsService } from '../../modules/polyperms/polyperms.service';

@Injectable()
export class PolyPermsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly polyPermsService?: PolyPermsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredNode = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredNode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        errorCode: 'E-polyfactory-020',
        message: 'Bạn chưa đăng nhập vào hệ thống',
      });
    }

    // Nếu có PolyPermsService được inject, kiểm tra bằng thuật toán 7 bước
    if (this.polyPermsService) {
      const targetTeamId = request.params?.teamId || request.body?.teamId;
      const res = await this.polyPermsService.resolvePermission(user.sub || user.id, requiredNode, targetTeamId);
      if (!res.allowed) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-020',
          message: `Bạn không có quyền thực hiện thao tác này (Thiếu node quyền: ${requiredNode})`,
          source: res.source,
        });
      }
      return true;
    }

    // Fallback in-memory check qua user payload
    const userPerms: string[] = user.permissions || [];
    const role: string = user.role;

    if (role === 'DEVELOPER' || role === 'MENTOR' || userPerms.includes('*') || userPerms.includes(requiredNode)) {
      return true;
    }

    if (userPerms.includes(`-${requiredNode}`)) {
      throw new ForbiddenException({
        errorCode: 'E-polyfactory-020',
        message: `Bạn đã bị thu hồi quyền truy cập (${requiredNode})`,
      });
    }

    throw new ForbiddenException({
      errorCode: 'E-polyfactory-020',
      message: `Bạn không có quyền thực hiện thao tác này (Thiếu node quyền: ${requiredNode})`,
    });
  }
}
