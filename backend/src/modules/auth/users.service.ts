import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Position, UserRole, UserStatus } from '@prisma/client';

export const VALID_POSITIONS: Position[] = [
  Position.FRONTEND,
  Position.BACKEND,
  Position.FULLSTACK,
  Position.TESTER,
  Position.UI_UX,
  Position.BA,
];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        trainingLevel: true,
        tags: { include: { tag: true } },
      },
    });
    return user;
  }

  async updateProfile(
    userId: string,
    data: { phone?: string; githubUsername?: string },
  ) {
    if (data.githubUsername) {
      const cleanGithub = data.githubUsername.trim();
      const existing = await this.prisma.user.findFirst({
        where: {
          githubUsername: cleanGithub,
          id: { not: userId },
        },
      });

      if (existing) {
        return {
          success: false,
          errorCode: 'E-polyfactory-006',
          message: 'GitHub username này đã được liên kết với một tài khoản khác.',
        };
      }
    }

    if (data.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: data.phone.trim(),
          id: { not: userId },
        },
      });
      if (existingPhone) {
        return {
          success: false,
          errorCode: 'E-polyfactory-005',
          message: 'Số điện thoại này đã được sử dụng bởi thành viên khác.',
        };
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: data.phone?.trim(),
        githubUsername: data.githubUsername?.trim(),
      },
    });

    if (data.githubUsername) {
      this.eventEmitter.emit('user.github.linked', {
        userId,
        githubUsername: data.githubUsername.trim(),
      });
    }

    return {
      success: true,
      user: updated,
    };
  }

  async updatePositions(userId: string, positions: Position[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Thành viên không tồn tại trong hệ thống.');
    }

    if (user.role === UserRole.TRAINEE) {
      return {
        success: false,
        errorCode: 'E-polyfactory-140',
        message: 'Tập sự (TRAINEE) chưa được phép chọn Công pháp. Hãy hoàn thành Level 3 để thăng cấp MEMBER!',
      };
    }

    const validSet = new Set(VALID_POSITIONS);
    const cleanedPositions = Array.from(new Set(positions.filter((p) => validSet.has(p))));

    if (cleanedPositions.length === 0) {
      return {
        success: false,
        errorCode: 'E-polyfactory-141',
        message: 'Vui lòng chọn ít nhất 1 Công pháp hợp lệ.',
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        positions: cleanedPositions,
      },
    });

    return {
      success: true,
      positions: updated.positions,
    };
  }

  async updateUserStatus(
    userId: string,
    newStatus: UserStatus,
    statusReason: string,
    actor: { id: string; role: string },
  ) {
    if (!statusReason || statusReason.trim().length < 5) {
      return {
        success: false,
        errorCode: 'E-polyfactory-008',
        message: 'Lý do thay đổi trạng thái bắt buộc nhập tối thiểu 5 ký tự.',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ledTeams: true,
        team: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Thành viên không tồn tại.');
    }

    // Chặn chuyển Team Lead chính khi chưa có người thay thế
    if (user.ledTeams && user.ledTeams.length > 0) {
      return {
        success: false,
        errorCode: 'E-polyfactory-007',
        message: 'Không thể chuyển trạng thái Team Lead chính khi chưa chỉ định Lead thay thế.',
      };
    }

    // Hủy các lịch tương lai
    if (newStatus === UserStatus.ALUMNI || newStatus === UserStatus.LOCKED) {
      await this.prisma.schedule.deleteMany({
        where: {
          userId,
          workDate: { gte: new Date() },
        },
      });

      // Gỡ khỏi vị trí Lead phó của bất kỳ team nào
      if (user.teamId && user.team?.viceLeadIds) {
        const vLeads = Array.isArray(user.team.viceLeadIds) ? (user.team.viceLeadIds as string[]) : [];
        if (vLeads.includes(userId)) {
          const nextVLeads = vLeads.filter((id) => id !== userId);
          await this.prisma.team.update({
            where: { id: user.teamId },
            data: { viceLeadIds: nextVLeads },
          });
        }
      }
    }

    const updateData: any = {
      status: newStatus,
      statusReason: statusReason.trim(),
    };

    if (newStatus === UserStatus.LOCKED) {
      updateData.tokenVersion = { increment: 1 };
      updateData.zaloUserId = null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      success: true,
      user: updated,
    };
  }

  async restoreUser(userId: string, actor: { id: string; role: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        statusReason: null,
      },
    });

    return {
      success: true,
      user: updated,
    };
  }

  // In-memory store for tech skills & availability
  private userTechSkills = new Map<string, string[]>();
  private userAvailability = new Map<string, { isAvailable: boolean; note?: string }>();

  /**
   * T073: Gắn thẻ kỹ năng công nghệ & trạng thái bận/rảnh (FR-polyfactory-008)
   */
  async updateTechSkills(userId: string, skills: string[]) {
    const cleanSkills = skills.map((s) => s.trim()).filter((s) => s.length > 0);
    this.userTechSkills.set(userId, cleanSkills);
    return { userId, techSkills: cleanSkills };
  }

  async updateAvailability(userId: string, isAvailable: boolean, note?: string) {
    const state = { isAvailable, note: note?.trim() || undefined };
    this.userAvailability.set(userId, state);
    return { userId, ...state };
  }

  /**
   * T073: API bộ lọc nhân sự đa chiều theo 6 Công pháp và kỹ năng
   */
  async filterMembers(filters: {
    position?: Position;
    techSkill?: string;
    isAvailable?: boolean;
    teamId?: string;
    role?: UserRole;
  }) {
    const where: any = {
      status: UserStatus.ACTIVE,
    };

    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.role) where.role = filters.role;

    const users = await this.prisma.user.findMany({
      where,
      include: {
        team: true,
        trainingLevel: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return users.filter((u) => {
      // Lọc theo 6 Công pháp (Position)
      if (filters.position) {
        const positions = (u.positions as string[]) || [];
        if (!positions.includes(filters.position)) return false;
      }

      // Lọc theo Tech Skill
      if (filters.techSkill) {
        const skills = this.userTechSkills.get(u.id) || ((u as any).techSkills as string[]) || [];
        const match = skills.some((s: string) => s.toLowerCase().includes(filters.techSkill!.toLowerCase()));
        if (!match) return false;
      }

      // Lọc theo isAvailable
      if (filters.isAvailable !== undefined) {
        const avail = this.userAvailability.get(u.id)?.isAvailable ?? true;
        if (avail !== filters.isAvailable) return false;
      }

      return true;
    });
  }
}


