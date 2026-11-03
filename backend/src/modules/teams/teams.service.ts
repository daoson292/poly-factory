import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

export const VALID_VICE_LEAD_PERMISSIONS = [
  'member.create',
  'room.status.update',
  'schedule.assign',
  'attendance.qr.create',
  'attendance.qr.delegate',
  'attendance.manual.override',
  'ticket.review',
  'training.task.manage',
  'training.task.review',
  'training.level.approve',
  'notification.create',
];

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTeams() {
    return this.prisma.team.findMany({
      include: {
        leader: { select: { id: true, fullName: true, email: true } },
        members: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      },
    });
  }

  async getTeamById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        leader: { select: { id: true, fullName: true, email: true } },
        members: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      },
    });
    if (!team) throw new NotFoundException('Team không tồn tại');
    return team;
  }

  async createTeam(data: { name: string; description?: string; leaderId?: string }) {
    const cleanName = data.name.trim();
    const existing = await this.prisma.team.findUnique({ where: { name: cleanName } });
    if (existing) {
      return {
        success: false,
        errorCode: 'E-polyfactory-040',
        message: 'Tên Team đã tồn tại trong xưởng.',
      };
    }

    const team = await this.prisma.team.create({
      data: {
        name: cleanName,
        description: data.description?.trim(),
        leaderId: data.leaderId || null,
        viceLeadIds: [],
        viceLeadPermissions: {},
      },
    });

    return {
      success: true,
      team,
    };
  }

  async configureViceLead(
    teamId: string,
    viceLeadIds: string[],
    permissions: Record<string, boolean> = {},
  ) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team không tồn tại');
    }

    // Tối đa 2 Lead phó / team
    if (viceLeadIds.length > 2) {
      return {
        success: false,
        errorCode: 'E-polyfactory-042',
        message: 'Mỗi team chỉ được bổ nhiệm tối đa 2 Lead phó.',
      };
    }

    // Xác minh từng Lead phó: bắt buộc là MEMBER thuộc chính team đó
    for (const vId of viceLeadIds) {
      const candidate = await this.prisma.user.findUnique({ where: { id: vId } });
      if (!candidate) {
        return {
          success: false,
          errorCode: 'E-polyfactory-041',
          message: `Không tìm thấy thành viên mang id ${vId}.`,
        };
      }

      if (candidate.role !== UserRole.MEMBER || candidate.teamId !== teamId) {
        return {
          success: false,
          errorCode: 'E-polyfactory-041',
          message: `Lead phó bắt buộc phải là MEMBER thuộc chính team đó (${candidate.fullName} không thỏa mãn).`,
        };
      }
    }

    // Lọc chỉ giữ 11 công tắc hợp lệ
    const cleanPerms: Record<string, boolean> = {};
    for (const key of VALID_VICE_LEAD_PERMISSIONS) {
      cleanPerms[key] = Boolean(permissions[key]);
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        viceLeadIds,
        viceLeadPermissions: cleanPerms,
      },
    });

    return {
      success: true,
      team: updated,
    };
  }

  async transferMember(userId: string, targetTeamId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thành viên cần chuyển team.');
    }

    const targetTeam = await this.prisma.team.findUnique({
      where: { id: targetTeamId },
    });

    if (!targetTeam) {
      throw new NotFoundException('Team đích không tồn tại.');
    }

    // Nếu đang là Lead phó ở team cũ -> gỡ khỏi viceLeadIds của team cũ
    if (user.teamId && user.team?.viceLeadIds) {
      const vLeads = Array.isArray(user.team.viceLeadIds)
        ? (user.team.viceLeadIds as string[])
        : [];
      if (vLeads.includes(userId)) {
        const nextVLeads = vLeads.filter((id) => id !== userId);
        await this.prisma.team.update({
          where: { id: user.teamId },
          data: { viceLeadIds: nextVLeads },
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { teamId: targetTeamId },
    });

    return {
      success: true,
      user: updated,
    };
  }

  // Mentor -> Set<StudentId> mapping
  private mentorStudents = new Map<string, Set<string>>();

  /**
   * T072: Quản lý Nhóm sinh viên hướng dẫn của Mentor xuyên Team (FR-polyfactory-043)
   */
  async assignMentorToStudent(mentorId: string, studentId: string) {
    const mentor = await this.prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor || (mentor.role !== UserRole.MENTOR && mentor.role !== UserRole.DEVELOPER)) {
      throw new BadRequestException('Chỉ Mentor hoặc Developer mới có thể nhận sinh viên hướng dẫn.');
    }

    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên.');
    }

    if (!this.mentorStudents.has(mentorId)) {
      this.mentorStudents.set(mentorId, new Set<string>());
    }
    this.mentorStudents.get(mentorId)!.add(studentId);

    return {
      mentorId,
      studentId,
      assignedAt: new Date().toISOString(),
    };
  }

  async removeMentorFromStudent(mentorId: string, studentId: string) {
    const set = this.mentorStudents.get(mentorId);
    if (set) {
      set.delete(studentId);
    }
    return { success: true };
  }

  async getMentorMentees(mentorId: string) {
    const studentIds = Array.from(this.mentorStudents.get(mentorId) || []);
    if (studentIds.length === 0) return [];

    return this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      include: {
        team: true,
        trainingLevel: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }
}


