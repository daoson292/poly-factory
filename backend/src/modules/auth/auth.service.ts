import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AddWhitelistMemberDto, ImportWhitelistMemberItemDto } from './dto/whitelist-member.dto';
import { UserRole, UserStatus } from '@prisma/client';

export const EMAIL_WHITELIST_REGEX = /^[a-zA-Z0-9._%+-]+@(gmail\.com|fpt\.edu\.vn)$/i;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validateGoogleUser(profile: { email: string; fullName: string; avatarUrl?: string }) {
    const normalizedEmail = profile.email?.toLowerCase().trim();

    // 1. Kiểm tra Whitelist
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { trainingLevel: true },
    });

    if (!user) {
      return {
        success: false,
        errorCode: 'E-polyfactory-001',
        message: 'Email của bạn chưa được cấp quyền vào xưởng. Vui lòng liên hệ Mentor hoặc Team Lead.',
      };
    }

    if (user.status === UserStatus.LOCKED) {
      return {
        success: false,
        errorCode: 'E-polyfactory-002',
        message: 'Tài khoản của bạn đã bị khóa quyền truy cập (LOCKED).',
      };
    }

    let currentStatus = user.status;
    let trainingLevelId = user.trainingLevelId;

    // 2. Kích hoạt tài khoản nếu là PENDING_ACTIVATION
    if (user.status === UserStatus.PENDING_ACTIVATION) {
      currentStatus = UserStatus.ACTIVE;

      // Nếu là TRAINEE chưa có level, tự gán Level 1
      if (user.role === UserRole.TRAINEE && !trainingLevelId) {
        const lv1 = await this.prisma.trainingLevel.findFirst({
          where: { orderIndex: 1 },
        });
        if (lv1) {
          trainingLevelId = lv1.id;
        }
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          fullName: profile.fullName || user.fullName,
          avatarUrl: profile.avatarUrl || user.avatarUrl,
          trainingLevelId: trainingLevelId,
        },
      });
    }

    // 3. Tạo JWT Token có đính kèm tokenVersion và cờ readOnly khi ALUMNI
    const isAlumni = currentStatus === UserStatus.ALUMNI;
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: currentStatus,
      teamId: user.teamId,
      tokenVersion: user.tokenVersion,
      readOnly: isAlumni,
    };

    return {
      success: true,
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: currentStatus,
        currentExp: user.currentExp,
        currentLevel: user.currentLevel,
        tokenVersion: user.tokenVersion,
        readOnly: isAlumni,
        teamId: user.teamId,
        trainingLevelId: trainingLevelId,
        positions: user.positions,
      },
    };
  }

  async logoutAllDevices(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    return {
      success: true,
      message: 'Đã đăng xuất toàn bộ thiết bị và vô hiệu hóa các token cũ.',
    };
  }

  async addMemberToWhitelist(
    dto: AddWhitelistMemberDto,
    actor: { id: string; role: string; teamId?: string | null },
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Kiểm tra định dạng email
    if (!EMAIL_WHITELIST_REGEX.test(normalizedEmail)) {
      return {
        success: false,
        errorCode: 'E-polyfactory-003',
        message: 'Định dạng email không hợp lệ. Chỉ chấp nhận Gmail hoặc FPT email (@fpt.edu.vn).',
      };
    }

    // Kiểm tra trùng email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return {
        success: false,
        errorCode: 'E-polyfactory-004',
        message: 'Email này đã tồn tại trong danh sách Whitelist của xưởng.',
      };
    }

    // Kiểm tra trùng SĐT nếu có
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone.trim() },
      });
      if (existingPhone) {
        return {
          success: false,
          errorCode: 'E-polyfactory-005',
          message: 'Số điện thoại này đã được sử dụng bởi thành viên khác.',
        };
      }
    }

    // Kiểm tra giới hạn Team Lead
    let assignedTeamId = dto.teamId || null;
    let assignedRole = dto.role || UserRole.TRAINEE;

    if (actor.role === UserRole.TEAM_LEAD) {
      if (dto.teamId && dto.teamId !== actor.teamId) {
        return {
          success: false,
          errorCode: 'E-polyfactory-040',
          message: 'Team Lead chỉ được phép thêm thành viên vào chính team của mình.',
        };
      }
      if (dto.role && dto.role !== UserRole.TRAINEE && dto.role !== UserRole.MEMBER) {
        return {
          success: false,
          errorCode: 'E-polyfactory-040',
          message: 'Team Lead chỉ được cấp vai trò TRAINEE hoặc MEMBER.',
        };
      }
      assignedTeamId = actor.teamId || null;
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        role: assignedRole,
        status: UserStatus.PENDING_ACTIVATION,
        teamId: assignedTeamId,
      },
    });

    this.eventEmitter.emit('member.whitelisted', {
      user: newUser,
      actorId: actor.id,
    });

    return {
      success: true,
      user: newUser,
    };
  }

  async previewWhitelistImport(
    rows: ImportWhitelistMemberItemDto[],
    actor: { id: string; role: string; teamId?: string | null },
  ) {
    const validRows: ImportWhitelistMemberItemDto[] = [];
    const invalidRows: Array<{ row: ImportWhitelistMemberItemDto; errorCode: string; message: string }> = [];
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    for (const row of rows) {
      const email = row.email?.toLowerCase().trim();

      if (!email || !EMAIL_WHITELIST_REGEX.test(email)) {
        invalidRows.push({
          row,
          errorCode: 'E-polyfactory-003',
          message: 'Email không đúng định dạng Gmail hoặc FPT email (@fpt.edu.vn).',
        });
        continue;
      }

      if (seenEmails.has(email)) {
        invalidRows.push({
          row,
          errorCode: 'E-polyfactory-004',
          message: 'Email trùng lặp trong tệp danh sách tải lên.',
        });
        continue;
      }

      if (row.phone) {
        const phone = row.phone.trim();
        if (seenPhones.has(phone)) {
          invalidRows.push({
            row,
            errorCode: 'E-polyfactory-005',
            message: 'Số điện thoại trùng lặp trong tệp danh sách tải lên.',
          });
          continue;
        }
        seenPhones.add(phone);
      }

      const existingDbEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingDbEmail) {
        invalidRows.push({
          row,
          errorCode: 'E-polyfactory-004',
          message: 'Email đã tồn tại sẵn trong hệ thống.',
        });
        continue;
      }

      if (row.phone) {
        const existingDbPhone = await this.prisma.user.findUnique({ where: { phone: row.phone.trim() } });
        if (existingDbPhone) {
          invalidRows.push({
            row,
            errorCode: 'E-polyfactory-005',
            message: 'Số điện thoại đã tồn tại sẵn trong hệ thống.',
          });
          continue;
        }
      }

      if (actor.role === UserRole.TEAM_LEAD) {
        if (row.role && row.role !== UserRole.TRAINEE && row.role !== UserRole.MEMBER) {
          invalidRows.push({
            row,
            errorCode: 'E-polyfactory-040',
            message: 'Team Lead không thể cấp vai trò cao hơn MEMBER.',
          });
          continue;
        }
      }

      seenEmails.add(email);
      validRows.push({
        ...row,
        email,
        teamId: actor.role === UserRole.TEAM_LEAD ? (actor.teamId || undefined) : row.teamId,
      });
    }

    return {
      totalCount: rows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows,
    };
  }

  async confirmWhitelistImport(
    validRows: ImportWhitelistMemberItemDto[],
    actor: { id: string; role: string; teamId?: string | null },
  ) {
    let importedCount = 0;

    for (const item of validRows) {
      const res = await this.addMemberToWhitelist(
        {
          email: item.email,
          fullName: item.fullName,
          phone: item.phone,
          role: item.role,
          teamId: item.teamId,
        },
        actor,
      );
      if (res.success) {
        importedCount++;
      }
    }

    return {
      success: true,
      importedCount,
    };
  }

  // In-memory device session store: userId -> deviceList
  private userDevices = new Map<string, any[]>();

  /**
   * T076: Quản lý danh sách thiết bị đăng nhập chi tiết (FR-polyfactory-009)
   */
  async recordDeviceLogin(
    userId: string,
    metadata: { ipAddress?: string; userAgent?: string; deviceName?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const currentDevices = this.userDevices.get(userId) || [];
    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDevice = {
      id: deviceId,
      deviceName: metadata.deviceName || metadata.userAgent?.slice(0, 30) || 'Trình duyệt Web',
      ipAddress: metadata.ipAddress || '127.0.0.1',
      userAgent: metadata.userAgent || 'Unknown',
      lastLoginAt: new Date().toISOString(),
      isActive: true,
    };

    const updatedDevices = [newDevice, ...currentDevices.slice(0, 9)];
    this.userDevices.set(userId, updatedDevices);

    return newDevice;
  }

  async getUserDevices(userId: string) {
    return this.userDevices.get(userId) || [];
  }

  async revokeDevice(userId: string, deviceId: string) {
    const currentDevices = this.userDevices.get(userId) || [];
    const updatedDevices = currentDevices.map((d) =>
      d.id === deviceId ? { ...d, isActive: false, revokedAt: new Date().toISOString() } : d,
    );
    this.userDevices.set(userId, updatedDevices);

    return { success: true, message: 'Đã hủy quyền thiết bị này.' };
  }
}



// Correct token expiration timestamp claims and session ttl (closes #4)
