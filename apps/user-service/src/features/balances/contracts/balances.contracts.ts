import { z } from '../../../infrastructure/documentation/zod';

export const BalanceResetResponseSchema = z
  .object({
    jobId: z.string().meta({ example: '12' }),
  })
  .meta({ id: 'BalanceResetResponse' });

export type BalanceResetResponse = z.input<typeof BalanceResetResponseSchema>;
