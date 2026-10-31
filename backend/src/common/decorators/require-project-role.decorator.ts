import { SetMetadata } from '@nestjs/common';

export interface ProjectAccessOptions {
  requireTester?: boolean;
  requireProjectLead?: boolean;
}

export const PROJECT_ACCESS_KEY = 'polyfactory_project_access_options';

export const RequireProjectAccess = (options?: ProjectAccessOptions) =>
  SetMetadata(PROJECT_ACCESS_KEY, options || {});
