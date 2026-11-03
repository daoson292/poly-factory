import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as os from 'os';

@Injectable()
export class AdminPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * T036: Đăng nhập Admin Portal 3 cấp (SUPER_ADMIN, ADMIN, VIEWER)
   * - Sai tài khoản/mật khẩu: E-polyfactory-250
   * - Tài khoản bị vô hiệu hóa (isActive = false): E-polyfactory-251
   */
  async login(username: string, pass: string) {
    const admin = await this.prisma.adminAccount.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException({
        errorCode: 'E-polyfactory-250',
        message: 'Tên đăng nhập hoặc mật khẩu Admin Portal không chính xác.',
      });
    }

    if (!admin.isActive) {
      throw new UnauthorizedException({
        errorCode: 'E-polyfactory-251',
        message: 'Tài khoản quản trị đã bị vô hiệu hóa.',
      });
    }

    const isMatch = await bcrypt.compare(pass, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        errorCode: 'E-polyfactory-250',
        message: 'Tên đăng nhập hoặc mật khẩu Admin Portal không chính xác.',
      });
    }

    const secret = this.configService.get<string>(
      'ADMIN_JWT_SECRET',
      'super_secret_admin_jwt_key_polyfactory_2026',
    );
    const token = this.jwtService.sign(
      { sub: admin.id, username: admin.username, adminRole: admin.adminRole },
      { secret, expiresIn: '7d' },
    );

    return {
      accessToken: token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        adminRole: admin.adminRole,
      },
    };
  }

  /**
   * T037: Dashboard giám sát tài nguyên phần cứng server (RAM/CPU/Uptime)
   */
  async getHardwareMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();

    return {
      uptimeSeconds: os.uptime(),
      memory: {
        totalMB: Math.round(totalMem / (1024 * 1024)),
        usedMB: Math.round(usedMem / (1024 * 1024)),
        freeMB: Math.round(freeMem / (1024 * 1024)),
        usagePercentage: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAvg: os.loadavg(),
      },
    };
  }

  /**
   * T036: Điều chỉnh EXP thành viên thủ công & Ghi AuditLog bắt buộc
   * - Lý do < 10 ký tự: E-polyfactory-252
   */
  async adjustUserExp(adminUsername: string, userId: string, amount: number, reason: string) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-252',
        message: 'Vui lòng nhập lý do điều chỉnh EXP bắt buộc (tối thiểu 10 ký tự).',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy thành viên để điều chỉnh EXP.');
    }

    const newBalance = Math.max(0, user.currentExp + amount);
    const newTotalExp = amount > 0 ? user.totalExpEarned + amount : user.totalExpEarned;

    // 1. Ghi sổ cái ExpTransaction
    await this.prisma.expTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: newBalance,
        source: 'MANUAL_ADJUSTMENT',
        reason: `[Admin: ${adminUsername}] ${reason.trim()}`,
      },
    });

    // 2. Cập nhật User
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentExp: newBalance,
        totalExpEarned: newTotalExp,
      },
    });

    // 3. Ghi Audit Log bất biến
    const auditLog = await this.prisma.auditLog.create({
      data: {
        tableName: 'users',
        action: 'UPDATE_EXP',
        recordId: userId,
        actorUsername: adminUsername,
        oldValues: { currentExp: user.currentExp, totalExpEarned: user.totalExpEarned },
        newValues: {
          currentExp: newBalance,
          totalExpEarned: newTotalExp,
          adjustmentAmount: amount,
          reason: reason.trim(),
        },
      },
    });

    return {
      success: true,
      userId,
      oldExp: user.currentExp,
      newExp: newBalance,
      adjustmentAmount: amount,
      auditLogId: auditLog.id,
    };
  }

  /**
   * T081: Quản lý và tải lên tài nguyên vật phẩm trang trí (/storage/cosmetics/) trên Admin Portal
   */
  async createCosmeticItem(data: {
    name: string;
    cosmeticType: any;
    filePath: string;
    requiredLevel?: number;
    description?: string;
  }) {
    if (!data.name || !data.filePath) {
      throw new BadRequestException('Tên vật phẩm và đường dẫn ảnh là bắt buộc.');
    }

    return this.prisma.cosmetic.create({
      data: {
        name: data.name.trim(),
        cosmeticType: data.cosmeticType,
        filePath: data.filePath,
        requiredLevel: data.requiredLevel ?? 1,
      },
    });
  }

  async listCosmeticItems() {
    return this.prisma.cosmetic.findMany({
      orderBy: [{ requiredLevel: 'asc' }, { name: 'asc' }],
    });
  }

  async deleteCosmeticItem(cosmeticId: string) {
    return this.prisma.cosmetic.delete({
      where: { id: cosmeticId },
    });
  }
}

