import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { ExpLedgerService } from './core/exp-ledger.service';
import { LevelEngineService } from './core/level-engine.service';
import { CurseEngineService } from './core/curse-engine.service';
import { RewardCoordinatorService } from './core/reward-coordinator.service';
import { CosmeticsService } from './plugins/cosmetics/cosmetics.service';
import { AchievementsService } from './plugins/achievements/achievements.service';
import { QuestsService } from './plugins/quests/quests.service';
import { BadgesService } from './plugins/badges/badges.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GamificationController],
  providers: [
    PrismaService,
    // Core Thưởng (GĐ1)
    ExpLedgerService,
    LevelEngineService,
    CurseEngineService,
    RewardCoordinatorService,
    // Module Phụ (GĐ3)
    CosmeticsService,
    AchievementsService,
    QuestsService,
    BadgesService,
  ],
  exports: [
    ExpLedgerService,
    LevelEngineService,
    CurseEngineService,
    RewardCoordinatorService,
    CosmeticsService,
  ],
})
export class GamificationModule {}
