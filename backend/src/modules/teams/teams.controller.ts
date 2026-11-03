import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getTeams() {
    return this.teamsService.getAllTeams();
  }

  @Get(':id')
  async getTeam(@Param('id') id: string) {
    return this.teamsService.getTeamById(id);
  }

  @Post()
  async createTeam(@Body() body: { name: string; description?: string; leaderId?: string }) {
    return this.teamsService.createTeam(body);
  }

  @Put(':id/vice-leads')
  async configureViceLeads(
    @Param('id') id: string,
    @Body() body: { viceLeadIds: string[]; permissions?: Record<string, boolean> },
  ) {
    return this.teamsService.configureViceLead(id, body.viceLeadIds || [], body.permissions || {});
  }

  @Patch('transfer')
  async transferMember(@Body() body: { userId: string; targetTeamId: string }) {
    return this.teamsService.transferMember(body.userId, body.targetTeamId);
  }
}
