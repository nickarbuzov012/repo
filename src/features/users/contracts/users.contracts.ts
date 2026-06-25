import { z } from '../../../infrastructure/documentation/zod';
import { UserRole } from '../entities/user.entity';

export const UserProfileSchema = z
  .object({
    id: z.uuid().meta({ example: '9f8c7f74-4eb1-4a39-85f6-9bce59f61a40' }),
    login: z.string().meta({ example: 'john' }),
    email: z.email().meta({ example: 'john@example.com' }),
    age: z.number().int().meta({ example: 25 }),
    description: z.string().meta({ example: 'About John' }),
    roles: z.array(z.enum(UserRole)).meta({ example: [UserRole.User] }),
    createdAt: z.date().transform((date) => date.toISOString()),
    updatedAt: z.date().transform((date) => date.toISOString()),
  })
  .meta({ id: 'UserProfile' });

export const UsersListQuerySchema = z
  .strictObject({
    page: z.coerce.number().int().min(1).default(1).meta({ example: 1 }),
    limit: z.coerce.number().int().min(1).max(100).default(10).meta({ example: 10 }),
    search: z.string().trim().min(1).max(64).optional().meta({ example: 'john' }),
  })
  .meta({ id: 'UsersListQuery' });

export const UsersListResponseSchema = z
  .object({
    items: z.array(UserProfileSchema),
    page: z.number().int().meta({ example: 1 }),
    limit: z.number().int().meta({ example: 10 }),
    total: z.number().int().meta({ example: 42 }),
    pages: z.number().int().meta({ example: 5 }),
  })
  .meta({ id: 'UsersListResponse' });

export const UpdateProfileRequestSchema = z
  .strictObject({
    login: z.string().trim().min(1).max(64).optional().meta({ example: 'johnny' }),
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((email) => email.toLowerCase())
      .optional()
      .meta({ example: 'johnny@example.com' }),
    password: z.string().min(6).optional().meta({ example: 'new-password123' }),
    age: z.number().int().min(1).max(150).optional().meta({ example: 26 }),
    description: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .optional()
      .meta({ example: 'Updated profile' }),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided',
  })
  .meta({ id: 'UpdateProfileRequest' });

export type UserProfile = z.input<typeof UserProfileSchema>;
export type UsersListQuery = z.infer<typeof UsersListQuerySchema>;
export type UsersListResponse = z.input<typeof UsersListResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
