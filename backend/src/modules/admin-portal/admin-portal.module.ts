import { Module } from '@nestjs/common';
import { AdminPortalService } from './admin-portal.service';
import { AdminPortalController } from './admin-portal.controller';
import { ConsoleLogGateway } from './console-log.gateway';
import { PrismaService } from '../../database/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AdminPortalController],
  providers: [AdminPortalService, ConsoleLogGateway, PrismaService],
  exports: [AdminPortalService, ConsoleLogGateway],
})
export class AdminPortalModule {}
