import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Position, UserStatus } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  async updateMyProfile(
    @Req() req: any,
    @Body() body: { phone?: string; githubUsername?: string },
  ) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/positions')
  async updateMyPositions(
    @Req() req: any,
    @Body() body: { positions: Position[] },
  ) {
    return this.usersService.updatePositions(req.user.sub, body.positions || []);
  }

  @UseGuards(JwtAuthGuard)
  @Put('positions')
  async updatePositions(
    @Req() req: any,
    @Body() body: { positions: Position[] },
  ) {
    return this.usersService.updatePositions(req.user.sub, body.positions || []);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus; statusReason: string },
    @Req() req: any,
  ) {
    return this.usersService.updateUserStatus(id, body.status, body.statusReason, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/restore')
  async restoreUser(@Param('id') id: string, @Req() req: any) {
    return this.usersService.restoreUser(id, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
