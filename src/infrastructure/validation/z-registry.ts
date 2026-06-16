import { authZSlice } from '../../features/auth/validators/auth';
import { healthZSlice } from '../../health/validators/health';

export type ZResponseConfig = {
  status?: number;
  schema: unknown;
  description?: string;
};

export type ZRouteConfig = {
  params?: any;
  query?: any;
  body?: any;
  res?: unknown | ZResponseConfig | ZResponseConfig[];
  tags?: string[];
  summary?: string;
  auth?: boolean;
  authOptional?: boolean;
};

export const zRegistry: Record<string, ZRouteConfig> = {
  ...healthZSlice,
  ...authZSlice,
};
