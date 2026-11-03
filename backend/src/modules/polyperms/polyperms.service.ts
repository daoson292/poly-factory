import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

export const ALUMNI_ALLOWED_VIEW_NODES = [
  'member.view',
  'room.status.view',
  'schedule.view',
  'project.view.public',
  'reward.view',
  'notification.view',
];

export const ROLE_HIERARCHY: Record<UserRole, string[]> = {
  TRAINEE: ['DEFAULT', 'TRAINEE'],
  MEMBER: ['DEFAULT', 'TRAINEE', 'MEMBER'],
  TEAM_LEAD: ['DEFAULT', 'TRAINEE', 'MEMBER', 'TEAM_LEAD'],
  MENTOR: ['DEFAULT', 'TRAINEE', 'MEMBER', 'TEAM_LEAD', 'MENTOR'],
  DEVELOPER: ['DEFAULT', 'TRAINEE', 'MEMBER', 'TEAM_LEAD', 'MENTOR', 'DEVELOPER'],
};

export interface ResolvePermissionResult {
  allowed: boolean;
  source: string;
  scope?: 'self' | 'team' | 'all';
}

@Injectable()
export class PolyPermsService {
  private readonly permissionCache = new Map<string, { perms: Map<string, ResolvePermissionResult>; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(private readonly prisma: PrismaService) {}

  invalidateUserCache(userId: string) {
    this.permissionCache.delete(userId);
  }

  async resolvePermission(
    userId: string,
    requiredNode: string,
    targetTeamId?: string,
  ): Promise<ResolvePermissionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        userPermissions: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
        groupMappings: {
          include: {
            group: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return { allowed: false, source: 'USER_NOT_FOUND' };
    }

    // ========================================================
    // BƯỚC 0: Kiểm tra UserStatus (LOCKED & ALUMNI)
    // ========================================================
    if (user.status === UserStatus.LOCKED) {
      return { allowed: false, source: 'STATUS_LOCKED' };
    }

    if (user.status === UserStatus.ALUMNI) {
      if (ALUMNI_ALLOWED_VIEW_NODES.includes(requiredNode)) {
        return { allowed: true, source: 'ALUMNI_VIEW', scope: 'all' };
      }
      return { allowed: false, source: 'ALUMNI_READONLY' };
    }

    // ========================================================
    // BƯỚC 1: Ngoại lệ cá nhân (UserPermission)
    // Ưu tiên dấu phủ định (-node) isAllowed = false trước
    // ========================================================
    const negativeOverride = user.userPermissions.find(
      (up) => up.nodeId === requiredNode && !up.isAllowed,
    );
    if (negativeOverride) {
      return { allowed: false, source: 'PERSONAL_DENIAL' };
    }

    const positiveOverride = user.userPermissions.find(
      (up) => up.nodeId === requiredNode && up.isAllowed,
    );
    if (positiveOverride) {
      return { allowed: true, source: 'PERSONAL_ALLOW', scope: 'all' };
    }

    // ========================================================
    // BƯỚC 2: Quyền Lead phó (Vice-Lead trong phạm vi team)
    // ========================================================
    if (user.teamId && user.team?.viceLeadIds) {
      const viceLeadIds = Array.isArray(user.team.viceLeadIds)
        ? (user.team.viceLeadIds as string[])
        : [];
      if (viceLeadIds.includes(userId)) {
        const viceLeadPerms = (user.team.viceLeadPermissions as Record<string, boolean>) || {};
        if (viceLeadPerms[requiredNode] === true) {
          if (!targetTeamId || targetTeamId === user.teamId) {
            return { allowed: true, source: 'VICE_LEAD', scope: 'team' };
          }
        }
      }
    }

    // ========================================================
    // BƯỚC 3: Quyền Ủy quyền trực ca hôm nay (nằm trong UserPermission đã check ở Bước 1)
    // ========================================================

    // ========================================================
    // BƯỚC 4: Nhóm phụ (SecondaryGroup)
    // ========================================================
    for (const mapping of user.groupMappings) {
      const matchedNeg = mapping.group.permissions.find(
        (p) => p.nodeId === requiredNode && !p.isAllowed,
      );
      if (matchedNeg) {
        return { allowed: false, source: 'SECONDARY_GROUP_DENIAL' };
      }

      const matchedPos = mapping.group.permissions.find(
        (p) => p.nodeId === requiredNode && p.isAllowed,
      );
      if (matchedPos) {
        return { allowed: true, source: 'SECONDARY_GROUP', scope: 'all' };
      }
    }

    // ========================================================
    // BƯỚC 5: Cây kế thừa Nhóm chính (Primary Role Hierarchy)
    // ========================================================
    const inheritedRoles = ROLE_HIERARCHY[user.role] || ['DEFAULT'];

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: {
        roleOrGroup: { in: inheritedRoles },
        nodeId: requiredNode,
        isAllowed: true,
      },
    });

    if (rolePerms.length > 0) {
      return { allowed: true, source: 'PRIMARY_ROLE', scope: 'all' };
    }

    // Mặc định từ chối
    return { allowed: false, source: 'DEFAULT_DENIAL' };
  }

  async delegateShiftToday(
    actor: { id: string; role: string; teamId?: string | null },
    targetUserId: string,
  ) {
    if (!actor.teamId) {
      throw new BadRequestException('Bạn chưa thuộc team nào để ủy quyền trực ca.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new BadRequestException('Không tìm thấy thành viên nhận ủy quyền.');
    }

    if (targetUser.teamId !== actor.teamId) {
      throw new BadRequestException('Chỉ được ủy quyền trực ca cho thành viên cùng Team.');
    }

    // Tính hạn 23:59:59.999 UTC+7 của ngày hôm nay
    const now = new Date();
    // UTC+7 offset in ms = 7 * 3600 * 1000
    const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
    const endOfDayVn = new Date(
      Date.UTC(
        vnTime.getUTCFullYear(),
        vnTime.getUTCMonth(),
        vnTime.getUTCDate(),
        16, // 16:59:59.999 UTC is 23:59:59.999 UTC+7
        59,
        59,
        999,
      ),
    );

    const nodesToDelegate = ['attendance.qr.create', 'attendance.manual.override'];

    for (const nodeId of nodesToDelegate) {
      const existing = await this.prisma.userPermission.findFirst({
        where: { userId: targetUserId, nodeId },
      });

      if (existing) {
        await this.prisma.userPermission.update({
          where: { id: existing.id },
          data: {
            isAllowed: true,
            expiresAt: endOfDayVn,
          },
        });
      } else {
        await this.prisma.userPermission.create({
          data: {
            userId: targetUserId,
            nodeId,
            isAllowed: true,
            expiresAt: endOfDayVn,
          },
        });
      }
    }

    this.invalidateUserCache(targetUserId);

    return {
      success: true,
      message: 'Đã ủy quyền trực ca hôm nay cho thành viên cùng team thành công.',
      expiresAt: endOfDayVn,
      delegatedNodes: nodesToDelegate,
    };
  }

  async revokeShiftDelegation(
    actor: { id: string; role: string; teamId?: string | null },
    targetUserId: string,
  ) {
    const nodesToRevoke = ['attendance.qr.create', 'attendance.manual.override'];

    await this.prisma.userPermission.deleteMany({
      where: {
        userId: targetUserId,
        nodeId: { in: nodesToRevoke },
      },
    });

    this.invalidateUserCache(targetUserId);

    return {
      success: true,
      message: 'Đã thu hồi ủy quyền trực ca thành công.',
    };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return [];

    const result = new Set<string>();
    const nodes = await this.prisma.permissionNode.findMany();

    for (const node of nodes) {
      const res = await this.resolvePermission(userId, node.nodeId);
      if (res.allowed) {
        result.add(node.nodeId);
      }
    }

    return Array.from(result);
  }

  /**
   * T070: Quản trị Nhóm phụ (SecondaryGroup) & gán/gỡ node quyền (kể cả -node)
   */
  async createSecondaryGroup(data: { code: string; name: string; description?: string }) {
    return this.prisma.secondaryGroup.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
    });
  }

  async setGroupPermission(groupId: string, nodeId: string, isAllowed: boolean) {
    const existing = await this.prisma.rolePermission.findFirst({
      where: { secondaryGroupId: groupId, nodeId },
    });

    if (existing) {
      return this.prisma.rolePermission.update({
        where: { id: existing.id },
        data: { isAllowed },
      });
    }

    return this.prisma.rolePermission.create({
      data: {
        roleOrGroup: `GROUP_${groupId}`,
        secondaryGroupId: groupId,
        nodeId,
        isAllowed,
      },
    });
  }

  async assignUserToSecondaryGroup(userId: string, groupId: string) {
    const existing = await this.prisma.userGroupMapping.findFirst({
      where: { userId, groupId },
    });
    if (existing) return existing;

    const mapping = await this.prisma.userGroupMapping.create({
      data: { userId, groupId },
    });
    this.invalidateUserCache(userId);
    return mapping;
  }

  async grantPersonalPermission(
    userId: string,
    nodeId: string,
    isAllowed: boolean,
    expiresAt?: Date | null,
  ) {
    const existing = await this.prisma.userPermission.findFirst({
      where: { userId, nodeId },
    });

    let perm;
    if (existing) {
      perm = await this.prisma.userPermission.update({
        where: { id: existing.id },
        data: { isAllowed, expiresAt: expiresAt ?? null },
      });
    } else {
      perm = await this.prisma.userPermission.create({
        data: {
          userId,
          nodeId,
          isAllowed,
          expiresAt: expiresAt ?? null,
        },
      });
    }

    this.invalidateUserCache(userId);
    return perm;
  }

  /**
   * T071: Công cụ Thử quyền giải thích nguồn gốc qua 7 bước (POST /api/polyperms/simulate)
   */
  async simulatePermission(userId: string, targetNode: string, targetTeamId?: string) {
    const steps: Array<{ step: number; name: string; matched: boolean; details: string }> = [];

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        userPermissions: true,
        groupMappings: {
          include: {
            group: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng để thử quyền.');
    }

    // Step 0: UserStatus check
    if (user.status === UserStatus.LOCKED) {
      steps.push({
        step: 0,
        name: 'Trạng thái tài khoản (Status Check)',
        matched: true,
        details: 'Tài khoản đang bị LOCKED -> Từ chối toàn bộ quyền.',
      });
      return { steps, finalAllowed: false, effectiveSource: 'Status LOCKED' };
    }

    if (user.status === UserStatus.ALUMNI) {
      const isAlumniAllowed = ALUMNI_ALLOWED_VIEW_NODES.includes(targetNode) || targetNode.endsWith('.view');
      steps.push({
        step: 0,
        name: 'Trạng thái cựu thành viên (ALUMNI Check)',
        matched: true,
        details: isAlumniAllowed
          ? 'ALUMNI chỉ được phép xem (view) -> Hợp lệ.'
          : 'ALUMNI không được phép chỉnh sửa/ghi -> Từ chối.',
      });
      return { steps, finalAllowed: isAlumniAllowed, effectiveSource: 'Status ALUMNI' };
    }

    steps.push({
      step: 0,
      name: 'Trạng thái tài khoản (Status Check)',
      matched: false,
      details: `Tài khoản ${user.status} hợp lệ, tiếp tục bước tiếp theo.`,
    });

    // Step 1: Personal UserPermissions (-node override)
    const personalEx = user.userPermissions.find((p) => p.nodeId === targetNode);
    if (personalEx) {
      const isExpired = personalEx.expiresAt && personalEx.expiresAt <= new Date();
      if (!isExpired) {
        steps.push({
          step: 1,
          name: 'Ngoại lệ cá nhân (Personal UserPermission)',
          matched: true,
          details: personalEx.isAllowed
            ? `Được cấp đích danh cá nhân qua node: ${targetNode}`
            : `Bị chặn đích danh bởi -node ngoại lệ: -${targetNode}`,
        });
        return {
          steps,
          finalAllowed: personalEx.isAllowed,
          effectiveSource: personalEx.isAllowed ? 'Personal Override' : 'Negative Exception (-node)',
        };
      }
    }
    steps.push({
      step: 1,
      name: 'Ngoại lệ cá nhân (Personal UserPermission)',
      matched: false,
      details: 'Không có ngoại lệ cá nhân áp dụng trực tiếp cho node này.',
    });

    // Step 2: Vice-Lead / Team Lead Scope
    if (user.role === UserRole.TEAM_LEAD && targetNode.startsWith('team.')) {
      steps.push({
        step: 2,
        name: 'Phạm vi Team Lead / Lead phó',
        matched: true,
        details: 'Quyền quản trị Team Lead áp dụng cho team quản lý.',
      });
      return { steps, finalAllowed: true, effectiveSource: 'Team Lead Authority' };
    }
    steps.push({
      step: 2,
      name: 'Phạm vi Team Lead / Lead phó',
      matched: false,
      details: 'Không kích hoạt quyền phạm vi Team Lead/Lead phó.',
    });

    // Step 3: Temporary Delegations (handled in UserPermission / Shift Delegations)
    steps.push({
      step: 3,
      name: 'Ủy quyền trực ca có thời hạn',
      matched: false,
      details: 'Không có ủy quyền trực ca riêng biệt cho node này.',
    });

    // Step 4: Secondary Groups
    for (const mapping of user.groupMappings) {
      const groupPerm = mapping.group.permissions.find((p) => p.nodeId === targetNode);
      if (groupPerm) {
        steps.push({
          step: 4,
          name: `Nhóm phụ: ${mapping.group.name}`,
          matched: true,
          details: groupPerm.isAllowed ? 'Cấp quyền bởi nhóm phụ' : 'Chặn quyền bởi nhóm phụ',
        });
        return {
          steps,
          finalAllowed: groupPerm.isAllowed,
          effectiveSource: `SecondaryGroup: ${mapping.group.name}`,
        };
      }
    }
    steps.push({
      step: 4,
      name: 'Nhóm phụ (Secondary Groups)',
      matched: false,
      details: 'Không có nhóm phụ nào gán node này.',
    });

    // Step 5: Role Hierarchy
    const res = await this.resolvePermission(userId, targetNode, targetTeamId);
    steps.push({
      step: 5,
      name: 'Cây thừa kế chức vụ (Role Hierarchy)',
      matched: res.allowed,
      details: res.allowed
        ? `Thừa kế qua chức vụ: ${res.source}`
        : 'Chức vụ hiện tại không có quyền trên node này.',
    });

    return {
      steps,
      finalAllowed: res.allowed,
      effectiveSource: res.source,
    };
  }
}


// Guard against circular role inheritance loops in tree evaluation (fixes #5)
