import { HealthCheckResponseSchema } from '../health.contracts';

export const validators = {
  check: {
    res: HealthCheckResponseSchema,
  },
};

export const healthZSlice = {
  'GET /health': {
    tags: ['Health'],
    summary: 'Check application health',
    res: { status: 200, schema: validators.check.res },
  },
};
