import { ProjectVisibility } from '@prisma/client';

export class CreateProjectDto {
  name: string;
  githubRepoUrl: string;
  visibility?: ProjectVisibility;
}
