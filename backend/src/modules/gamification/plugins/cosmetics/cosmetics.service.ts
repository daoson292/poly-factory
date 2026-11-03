import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class CosmeticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T080: Lấy kho đồ trang trí cá nhân
   */
  async getUserInventory(userId: string) {
    return this.prisma.userCosmetic.findMany({
      where: { userId },
      include: { cosmetic: true },
      orderBy: { acquiredAt: 'desc' },
    });
  }

  /**
   * T080: Trang bị vật phẩm làm đẹp (Khung avatar, Banner, Name Color...)
   * - Kiểm tra điều kiện level mở khóa
   * - Tự động tháo vật phẩm cũ cùng loại
   */
  async equipCosmetic(userId: string, cosmeticId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');

    const cosmetic = await this.prisma.cosmetic.findUnique({ where: { id: cosmeticId } });
    if (!cosmetic) throw new NotFoundException('Không tìm thấy vật phẩm.');

    // Kiểm tra cấp bậc yêu cầu
    if (cosmetic.requiredLevel && user.currentLevel < cosmetic.requiredLevel) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-180',
        message: `Vật phẩm này yêu cầu đạt cấp độ ${cosmetic.requiredLevel} trở lên.`,
      });
    }

    // Tháo các vật phẩm cùng loại
    const userCosmetics = await this.prisma.userCosmetic.findMany({
      where: { userId },
      include: { cosmetic: true },
    });

    for (const uc of userCosmetics) {
      if (uc.cosmetic.cosmeticType === cosmetic.cosmeticType && uc.isEquipped) {
        await this.prisma.userCosmetic.update({
          where: { id: uc.id },
          data: { isEquipped: false },
        });
      }
    }

    // Trang bị vật phẩm mới
    return this.prisma.userCosmetic.upsert({
      where: {
        userId_cosmeticId: { userId, cosmeticId },
      },
      create: {
        userId,
        cosmeticId,
        isEquipped: true,
      },
      update: {
        isEquipped: true,
      },
    });
  }

  /**
   * T080: Tháo vật phẩm trang trí
   */
  async unequipCosmetic(userId: string, cosmeticId: string) {
    return this.prisma.userCosmetic.update({
      where: {
        userId_cosmeticId: { userId, cosmeticId },
      },
      data: { isEquipped: false },
    });
  }
}
