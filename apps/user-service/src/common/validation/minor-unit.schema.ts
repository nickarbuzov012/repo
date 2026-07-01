import { z } from '../../infrastructure/documentation/zod';

export const POSTGRES_INTEGER_MAX = 2_147_483_647;

export const MinorUnitSchema = z
  .number()
  .int()
  .nonnegative()
  .max(POSTGRES_INTEGER_MAX)
  .meta({
    description: 'Monetary amount in minor units',
    example: 2051,
  });
