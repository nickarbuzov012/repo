import { HealthCheckResponseSchema } from '../health.contracts';

export const validators = {
  check: {
    res: HealthCheckResponseSchema,
  },
};

const publicPolicy = {
  isConfigured: true,
  isProtected: false,
  allowRoles: [],
};

export const healthZSlice = {
  'GET /health': {
    tags: ['Health'],
    summary: 'Check application health',
    policy: publicPolicy,
    res: { status: 200, schema: validators.check.res },
  },
};
