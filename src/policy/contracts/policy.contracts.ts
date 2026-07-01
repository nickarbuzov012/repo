import { z } from '../../infrastructure/documentation/zod';
import { UserRole } from '../../features/users/entities/user.entity';

export const HttpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

export const EndpointPolicySchema = z
  .object({
    method: HttpMethodSchema,
    path: z
      .string()
      .min(1)
      .startsWith('/')
      .meta({ example: '/balances/reset' }),
    isConfigured: z.boolean(),
    isProtected: z.boolean(),
    allowRoles: z.array(z.enum(UserRole)),
  })
  .meta({ id: 'EndpointPolicy' });

export const UpdateEndpointPolicyRequestSchema = z
  .strictObject({
    method: HttpMethodSchema,
    path: z
      .string()
      .min(1)
      .startsWith('/')
      .meta({ example: '/balances/reset' }),
    isConfigured: z.boolean(),
    isProtected: z.boolean(),
    allowRoles: z.array(z.enum(UserRole)).default([]),
  })
  .refine((payload) => payload.isProtected || payload.allowRoles.length === 0, {
    message: 'Public endpoints cannot restrict roles',
    path: ['allowRoles'],
  })
  .meta({ id: 'UpdateEndpointPolicyRequest' });

export type EndpointPolicy = z.input<typeof EndpointPolicySchema>;
export type UpdateEndpointPolicyRequest = z.infer<
  typeof UpdateEndpointPolicyRequestSchema
>;
