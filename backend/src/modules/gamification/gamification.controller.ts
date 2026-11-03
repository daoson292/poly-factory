import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { CosmeticsService } from './plugins/cosmetics/cosmetics.service';
import { BadgesService } from './plugins/badges/badges.service';
import { QuestsService } from './plugins/quests/quests.service';
import { RewardCoordinatorService } from './core/reward-coordinator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(
    private readonly cosmeticsService: CosmeticsService,
    private readonly badgesService: BadgesService,
    private readonly questsService: QuestsService,
    private readonly rewardCoordinator: RewardCoordinatorService,
  ) {}

  @Get('leaderboard')
  async getLeaderboard(@Query('period') period?: 'all' | 'month', @Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 20;
    return this.rewardCoordinator.getLeaderboard(period || 'all', take);
  }

  @Post('grant')
  async grantReward(
    @Body() body: { userId: string; expAmount: number; cosmeticIds?: string[]; reason?: string },
  ) {
    return this.rewardCoordinator.grantRewardPackage(
      body.userId,
      body.expAmount,
      body.cosmeticIds,
      body.reason,
    );
  }

  @Post('users/:userId/pardon-curse')
  async pardonCurse(@Req() req: any, @Param('userId') userId: string) {
    return this.rewardCoordinator.pardonCurse(req.user.sub, userId);
  }

  @Get('inventory')
  async getInventory(@Req() req: any) {
    return this.cosmeticsService.getUserInventory(req.user.sub);
  }

  @Post('cosmetics/:id/equip')
  async equipCosmetic(@Req() req: any, @Param('id') id: string) {
    return this.cosmeticsService.equipCosmetic(req.user.sub, id);
  }

  @Get('badges')
  async getBadges(@Req() req: any) {
    return this.badgesService.getUserBadges(req.user.sub);
  }

  @Get('quests')
  async getQuests(@Req() req: any) {
    return this.questsService.getDailyAndWeeklyQuests(req.user.sub);
  }

  @Post('quests/:id/claim')
  async claimQuest(@Req() req: any, @Param('id') id: string) {
    return this.questsService.claimQuestReward(req.user.sub, id);
  }

  @Get('leaderboard/attendance')
  async getAttendanceLeaderboard(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.rewardCoordinator.getAttendanceLeaderboard(take);
  }

  @Get('leaderboard/github')
  async getGitHubLeaderboard(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.rewardCoordinator.getGitHubLeaderboard(take);
  }

  @Get('leaderboard/testing')
  async getTestingLeaderboard(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.rewardCoordinator.getTestingLeaderboard(take);
  }
}
