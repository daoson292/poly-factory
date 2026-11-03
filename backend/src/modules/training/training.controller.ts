import { Controller, Post, Put, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubmissionStatus, TaskType } from '@prisma/client';

@Controller('training')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('tasks')
  async getTasks(@Query('levelId') levelId?: string) {
    return this.trainingService.getTasks(levelId);
  }

  @Post('tasks')
  async createTask(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      googleDocsUrl: string;
      driveLink?: string;
      type?: TaskType;
      levelId?: string;
      expReward?: number;
      isMandatory?: boolean;
      deadline?: Date;
    },
  ) {
    return this.trainingService.createTask(req.user.sub, body);
  }

  @Post('tasks/:taskId/submit')
  async submit(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Body() body: { submissionLink?: string; submissionUrl?: string; notes?: string },
  ) {
    const link = body.submissionLink || body.submissionUrl || '';
    return this.trainingService.submitTask(req.user.sub, taskId, link, body.notes);
  }

  @Put('submissions/:id/review')
  async review(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: SubmissionStatus; feedback?: string },
  ) {
    return this.trainingService.reviewSubmission(req.user.sub, id, body.status, body.feedback);
  }

  @Get('trainees/:id/progress')
  async getTraineeProgress(@Param('id') id: string) {
    return this.trainingService.getTraineeProgress(id);
  }

  @Post('trainees/:id/approve-level')
  async approveLevel(@Req() req: any, @Param('id') id: string) {
    return this.trainingService.approveLevel(req.user.sub, id);
  }

  @Post('trainees/:id/special-promote')
  async specialPromote(@Req() req: any, @Param('id') id: string) {
    return this.trainingService.specialPromote(req.user.sub, id);
  }
}
