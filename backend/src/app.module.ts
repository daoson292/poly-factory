import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Database
import { PrismaService } from './database/prisma.service';

// 17 Phân hệ Modular Monolith (M01 -> M17)
import { AuthModule } from './modules/auth/auth.module';
import { PolyPermsModule } from './modules/polyperms/polyperms.module';
import { TeamsModule } from './modules/teams/teams.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TrainingModule } from './modules/training/training.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TestingModule } from './modules/testing/testing.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailModule } from './modules/email/email.module';
import { DuolingoRemindersModule } from './modules/duolingo-reminders/duolingo-reminders.module';
import { AdminPortalModule } from './modules/admin-portal/admin-portal.module';
import { ZaloMiniAppModule } from './modules/zalo-miniapp/zalo-miniapp.module';

@Module({
  imports: [
    // Global Config & In-Memory Event Bus
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),

    // 17 Phân hệ
    AuthModule,
    PolyPermsModule,
    TeamsModule,
    RoomsModule,
    SchedulesModule,
    AttendanceModule,
    TicketsModule,
    ReportsModule,
    TrainingModule,
    ProjectsModule,
    TestingModule,
    GamificationModule,
    NotificationsModule,
    EmailModule,
    DuolingoRemindersModule,
    AdminPortalModule,
    ZaloMiniAppModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
