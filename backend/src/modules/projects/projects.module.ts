import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { GitHubWebhookService } from './github-webhook.service';
import { ProjectCertificateService } from './project-certificate.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    GitHubWebhookService,
    ProjectCertificateService,
    PrismaService,
  ],
  exports: [ProjectsService, GitHubWebhookService, ProjectCertificateService],
})
export class ProjectsModule {}
