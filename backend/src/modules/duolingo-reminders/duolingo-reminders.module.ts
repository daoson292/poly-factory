import { Module } from '@nestjs/common';
import { DuolingoRemindersService } from './duolingo-reminders.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  providers: [DuolingoRemindersService, PrismaService],
  exports: [DuolingoRemindersService],
})
export class DuolingoRemindersModule {}
