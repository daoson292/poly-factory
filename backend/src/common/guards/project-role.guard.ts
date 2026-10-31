import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { PROJECT_ACCESS_KEY, ProjectAccessOptions } from '../decorators/require-project-role.decorator';
import { ProjectVisibility, UserRole } from '@prisma/client';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<ProjectAccessOptions>(
      PROJECT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        errorCode: 'E-polyfactory-020',
        message: 'Bạn chưa đăng nhập vào hệ thống',
      });
    }

    // DEVELOPER và MENTOR có quyền vượt cấp toàn dự án
    if (user.role === UserRole.DEVELOPER || user.role === UserRole.MENTOR) {
      return true;
    }

    const projectId =
      request.params?.projectId ||
      request.params?.id ||
      request.body?.projectId ||
      request.query?.projectId;

    if (!projectId) {
      return true;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: user.sub || user.id },
        },
      },
    });

    if (!project) {
      throw new BadRequestException('Dự án không tồn tại.');
    }

    const member = project.members?.[0];
    const isCreator = project.createdById === (user.sub || user.id);
    const isTeamLead = user.role === UserRole.TEAM_LEAD;

    // Kiểm tra dự án PRIVATE
    if (project.visibility === ProjectVisibility.PRIVATE && !member && !isCreator && !isTeamLead) {
      throw new ForbiddenException({
        errorCode: 'E-polyfactory-307',
        message: 'Dự án này là PRIVATE. Bạn không phải thành viên dự án.',
      });
    }

    // Nếu không có yêu cầu vai trò đặc biệt
    if (!options) {
      return true;
    }

    // Yêu cầu quyền Kiểm thử (requireTester)
    if (options.requireTester) {
      const canExecuteTest =
        isTeamLead ||
        (member &&
          (member.position === 'TESTER' ||
            member.canTest === true ||
            member.isProjectLead === true));

      if (!canExecuteTest) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-300',
          message:
            'Bạn không có quyền thực thi kiểm thử hoặc xác minh lỗi trên dự án này (Yêu cầu TESTER, cờ canTest hoặc Lead).',
        });
      }
    }

    // Yêu cầu quyền Trưởng dự án (requireProjectLead)
    if (options.requireProjectLead) {
      const isLead = isTeamLead || (member && member.isProjectLead === true);

      if (!isLead) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-304',
          message:
            'Chỉ Trưởng dự án, Lead hoặc Mentor mới có quyền đóng đợt test / phân xử triage.',
        });
      }
    }

    return true;
  }
}
