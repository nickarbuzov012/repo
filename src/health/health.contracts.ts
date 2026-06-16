import { z } from 'zod';

export const HealthCheckResponseSchema = z
  .object({
    status: z.enum(['ok', 'error']).meta({ example: 'ok' }),
    database: z.enum(['ok', 'error']).meta({ example: 'ok' }),
  })
  .meta({ id: 'HealthCheckResponse' });

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
