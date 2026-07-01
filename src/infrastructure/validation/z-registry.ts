import { authZSlice } from '../../features/auth/validators/auth';
import { balancesZSlice } from '../../features/balances/validators/balances';
import { usersZSlice } from '../../features/users/validators/users';
import { healthZSlice } from '../../health/validators/health';
import { type UserRole } from '../../features/users/entities/user.entity';
import { policyZSlice } from '../../policy/validators/policy';
import type { z } from '../documentation/zod';

export type ZResponseConfig = {
  status?: number;
  schema: unknown;
  description?: string;
};

export type ZRouteConfig = {
  params?: z.ZodType;
  query?: z.ZodType;
  cookies?: z.ZodType;
  body?: z.ZodType;
  multipartBody?: z.ZodType;
  res?: unknown | ZResponseConfig | ZResponseConfig[];
  tags?: string[];
  summary?: string;
  auth?: boolean;
  authOptional?: boolean;
  unauthorized?: boolean;
  policy?: {
    isConfigured: boolean;
    isProtected: boolean;
    allowRoles: UserRole[];
  };
};

export const zRegistry: Record<string, ZRouteConfig> = {
  ...healthZSlice,
  ...authZSlice,
  ...policyZSlice,
  ...balancesZSlice,
  ...usersZSlice,
};
