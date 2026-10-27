import { Module } from '@nestjs/common';
import { PolyPermsService } from './polyperms.service';
import { PolyPermsController } from './polyperms.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PolyPermsController],
  providers: [PolyPermsService, PrismaService],
  exports: [PolyPermsService],
})
export class PolyPermsModule {}
