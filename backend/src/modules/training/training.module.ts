import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ReportsModule } from '../reports/reports.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, ReportsModule, GamificationModule],
  controllers: [TrainingController],
  providers: [TrainingService, PrismaService],
  exports: [TrainingService],
})
export class TrainingModule {}
