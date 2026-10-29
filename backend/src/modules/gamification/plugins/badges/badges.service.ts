import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T082: Lấy bộ sưu tập Tag và Huy hiệu của thành viên
   */
  async getUserBadges(userId: string) {
    return this.prisma.userTag.findMany({
      where: { userId },
      include: { tag: true },
      orderBy: { acquiredAt: 'desc' },
    });
  }

  /**
   * T082: Bật/tắt hiển thị Tag trên hồ sơ
   * - Khóa cứng không cho gỡ Tag Xấu đang bị phong ấn (E-polyfactory-192)
   */
  async toggleDisplayTag(userId: string, tagId: string, isDisplayed: boolean) {
    const userTag = await this.prisma.userTag.findUnique({
      where: {
        userId_tagId: { userId, tagId },
      },
      include: { tag: true },
    });

    if (!userTag) {
      throw new NotFoundException('Không tìm thấy huy hiệu/tag này trong hồ sơ.');
    }

    if (userTag.isLocked && !isDisplayed) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-192',
        message: 'Tag Xấu đang bị phong ấn bị khóa cứng trên hồ sơ, không thể tự gỡ.',
      });
    }

    return this.prisma.userTag.update({
      where: {
        userId_tagId: { userId, tagId },
      },
      data: { isDisplayed },
    });
  }
}
