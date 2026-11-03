import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { GitHubWebhookService } from './github-webhook.service';
import { ProjectCertificateService } from './project-certificate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplicationStatus, Position, ProjectVisibility } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly webhookService: GitHubWebhookService,
    private readonly certificateService: ProjectCertificateService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createProject(
    @Req() req: any,
    @Body() body: { name: string; githubRepoUrl: string; visibility?: ProjectVisibility },
  ) {
    return this.projectsService.createProject(req.user.sub || req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProjects(@Req() req: any) {
    return this.projectsService.getProjects(req.user.sub || req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getProjectById(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getProjectById(req.user.sub || req.user.id, req.user.role, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  async applyToProject(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      className: string;
      studentCode: string;
      appliedPosition: Position;
      notesPortfolio?: string;
    },
  ) {
    return this.projectsService.applyToProject(req.user.sub || req.user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/applications/:appId/review')
  async reviewApplication(
    @Req() req: any,
    @Param('appId') appId: string,
    @Body()
    body: {
      status: ApplicationStatus;
      feedback?: string;
      isProjectLead?: boolean;
      canTest?: boolean;
    },
  ) {
    return this.projectsService.reviewApplication(req.user.sub || req.user.id, appId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/members/:memberId')
  async updateMember(
    @Req() req: any,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
    @Body()
    body: {
      position?: Position;
      isProjectLead?: boolean;
      canTest?: boolean;
      isDeliverableVerified?: boolean;
    },
  ) {
    return this.projectsService.updateMember(req.user.sub || req.user.id, projectId, memberId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  async completeProject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { overrideReason?: string },
  ) {
    return this.projectsService.completeProject(
      req.user.sub || req.user.id,
      req.user.role,
      id,
      body.overrideReason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/certificates/:userId')
  async issueCertificate(@Param('id') projectId: string, @Param('userId') userId: string) {
    return this.certificateService.evaluateAndIssueCertificate(projectId, userId);
  }

  @Post('github/webhook')
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-github-event') eventType: string,
    @Body() payload: any,
  ) {
    // Xác thực HMAC signature
    this.webhookService.verifySignature(JSON.stringify(payload), signature);
    return this.webhookService.processWebhook(deliveryId, eventType, payload);
  }
}
