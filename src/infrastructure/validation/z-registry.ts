import { authZSlice } from '../../features/auth/validators/auth';
import { usersZSlice } from '../../features/users/validators/users';
import { healthZSlice } from '../../health/validators/health';

export type ZResponseConfig = {
  status?: number;
  schema: unknown;
  description?: string;
};

export type ZRouteConfig = {
  params?: any;
  query?: any;
  cookies?: any;
  body?: any;
  res?: unknown | ZResponseConfig | ZResponseConfig[];
  tags?: string[];
  summary?: string;
  auth?: boolean;
  authOptional?: boolean;
  unauthorized?: boolean;
};

export const zRegistry: Record<string, ZRouteConfig> = {
  ...healthZSlice,
  ...authZSlice,
  ...usersZSlice,
};
