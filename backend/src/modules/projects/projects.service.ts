import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ProjectStatus,
  ProjectVisibility,
  ApplicationStatus,
  Position,
  UserRole,
  BugSeverity,
  BugStatus,
} from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T043: Tạo thẻ dự án mới (FR-polyfactory-150)
   * - Kiểm tra trùng tên hoặc trùng githubRepoUrl (E-polyfactory-150)
   */
  async createProject(
    creatorId: string,
    data: { name: string; githubRepoUrl: string; visibility?: ProjectVisibility },
  ) {
    const existing = await this.prisma.project.findFirst({
      where: {
        OR: [{ name: data.name }, { githubRepoUrl: data.githubRepoUrl }],
      },
    });

    if (existing) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-150',
        message: 'Tên dự án hoặc đường dẫn GitHub repository đã tồn tại trong hệ thống.',
      });
    }

    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        githubRepoUrl: data.githubRepoUrl,
        visibility: data.visibility || ProjectVisibility.PUBLIC,
        status: ProjectStatus.ACTIVE,
        createdById: creatorId,
      },
    });

    // Thêm creator làm Project Lead mặc định
    await this.prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: creatorId,
        position: Position.FULLSTACK,
        isProjectLead: true,
        canTest: true,
      },
    });

    return project;
  }

  /**
   * T043: Lấy danh sách dự án có lọc theo quyền
   */
  async getProjects(userId: string, userRole: UserRole) {
    if (userRole === UserRole.DEVELOPER || userRole === UserRole.MENTOR) {
      return this.prisma.project.findMany({
        include: { members: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.project.findMany({
      where: {
        OR: [
          { visibility: ProjectVisibility.PUBLIC },
          { members: { some: { userId } } },
        ],
      },
      include: { members: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * T043: Lấy chi tiết dự án (kiểm tra quyền truy cập dự án PRIVATE)
   */
  async getProjectById(userId: string, userRole: UserRole, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
        certificates: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án.');
    }

    if (project.visibility === ProjectVisibility.PRIVATE) {
      const isMember = project.members.some((m) => m.userId === userId);
      const isElevated = userRole === UserRole.DEVELOPER || userRole === UserRole.MENTOR;
      if (!isMember && !isElevated) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-307',
          message: 'Dự án ở chế độ RIÊNG TƯ (PRIVATE), chỉ thành viên dự án mới có quyền truy cập.',
        });
      }
    }

    return project;
  }

  /**
   * T044: Nộp đơn tham gia dự án theo 6 Công pháp (FR-polyfactory-152)
   * - Chặn TRAINEE (E-polyfactory-151)
   * - Chặn gửi đơn trùng hoặc đã là thành viên (E-polyfactory-152)
   */
  async applyToProject(
    userId: string,
    projectId: string,
    data: {
      className: string;
      studentCode: string;
      appliedPosition: Position;
      notesPortfolio?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === UserRole.TRAINEE) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-151',
        message: 'Bạn cần đạt cấp bậc Thành viên chính thức (MEMBER) để mở khóa đăng ký tham gia dự án.',
      });
    }

    const isMember = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    if (isMember) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-152',
        message: 'Bạn đã là thành viên trong dự án này.',
      });
    }

    const pendingApp = await this.prisma.projectApplication.findFirst({
      where: {
        projectId,
        userId,
        status: ApplicationStatus.PENDING_APPROVAL,
      },
    });
    if (pendingApp) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-152',
        message: 'Bạn đang có đơn đăng ký chờ xét duyệt trong dự án này.',
      });
    }

    return this.prisma.projectApplication.create({
      data: {
        userId,
        projectId,
        className: data.className,
        studentCode: data.studentCode,
        appliedPosition: data.appliedPosition,
        notesPortfolio: data.notesPortfolio,
        status: ApplicationStatus.PENDING_APPROVAL,
      },
    });
  }

  /**
   * T044: Duyệt đơn đăng ký dự án (FR-polyfactory-153)
   */
  async reviewApplication(
    reviewerId: string,
    applicationId: string,
    data: {
      status: ApplicationStatus;
      feedback?: string;
      isProjectLead?: boolean;
      canTest?: boolean;
    },
  ) {
    const app = await this.prisma.projectApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký dự án.');
    }

    const updated = await this.prisma.projectApplication.update({
      where: { id: applicationId },
      data: {
        status: data.status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    if (data.status === ApplicationStatus.APPROVED) {
      const canTest = data.canTest ?? app.appliedPosition === Position.TESTER;
      await this.prisma.projectMember.create({
        data: {
          projectId: app.projectId,
          userId: app.userId,
          position: app.appliedPosition,
          isProjectLead: data.isProjectLead ?? false,
          canTest,
        },
      });
    }

    return updated;
  }

  /**
   * T044: Cập nhật thông tin thành viên dự án (nghiệm thu deliverable UI_UX/BA)
   */
  async updateMember(
    leadId: string,
    projectId: string,
    memberId: string,
    data: {
      position?: Position;
      isProjectLead?: boolean;
      canTest?: boolean;
      isDeliverableVerified?: boolean;
    },
  ) {
    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: {
        position: data.position,
        isProjectLead: data.isProjectLead,
        canTest: data.canTest,
        isDeliverableVerified: data.isDeliverableVerified,
      },
    });
  }

  /**
   * T055: Release Gate hoàn thành dự án (Mục 6.11.B, E-polyfactory-305)
   */
  async completeProject(
    actorId: string,
    actorRole: UserRole,
    projectId: string,
    overrideReason?: string,
  ) {
    // Kiểm tra bug CRITICAL hoặc HIGH chưa CLOSED
    const criticalBugs = await this.prisma.bug.findMany({
      where: {
        projectId,
        status: { not: BugStatus.CLOSED },
        severity: { in: [BugSeverity.CRITICAL, BugSeverity.HIGH] },
      },
    });

    if (criticalBugs.length > 0) {
      const isElevated = actorRole === UserRole.DEVELOPER || actorRole === UserRole.MENTOR;
      const hasValidOverride = overrideReason && overrideReason.trim().length >= 10;

      if (!isElevated || !hasValidOverride) {
        throw new BadRequestException({
          errorCode: 'E-polyfactory-305',
          message: 'Cổng Release Gate chặn hoàn thành: Dự án vẫn còn lỗi CRITICAL hoặc HIGH chưa được đóng.',
        });
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.COMPLETED,
        completionOverrideReason: overrideReason || null,
      },
      include: { members: true },
    });
  }
}
