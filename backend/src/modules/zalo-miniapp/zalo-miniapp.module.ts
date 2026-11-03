import { Module } from '@nestjs/common';
import { ZaloMiniAppService } from './zalo-miniapp.service';
import { ZaloMiniAppController } from './zalo-miniapp.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ZaloMiniAppController],
  providers: [ZaloMiniAppService, PrismaService],
  exports: [ZaloMiniAppService],
})
export class ZaloMiniAppModule {}
