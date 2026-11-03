import { Module } from '@nestjs/common';
import { TestCasesService } from './test-cases.service';
import { TestRunsService } from './test-runs.service';
import { BugsService } from './bugs.service';
import { TestingExpService } from './testing-exp.service';
import { TestingController } from './testing.controller';
import { BugEvidenceController } from './bug-evidence.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [TestingController, BugEvidenceController],
  providers: [
    TestCasesService,
    TestRunsService,
    BugsService,
    TestingExpService,
    PrismaService,
  ],
  exports: [
    TestCasesService,
    TestRunsService,
    BugsService,
    TestingExpService,
  ],
})
export class TestingModule {}
