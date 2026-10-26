import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'polyperms_required_node';
export const RequirePerm = (node: string) => SetMetadata(PERMISSION_KEY, node);
