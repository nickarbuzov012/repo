import { z } from '../../../infrastructure/documentation/zod';
import { MinorUnitSchema } from '../../../common/validation/minor-unit.schema';
import { UserRole } from '../entities/user.entity';
import { AVATAR_MIME_TYPES } from '../avatar.constants';

const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024; // 10 mb

export const AvatarSchema = z
  .object({
    id: z.uuid().meta({ example: '8b93b7e0-21bb-4a8c-9a23-812c1a22ad16' }),
    fileName: z
      .string()
      .meta({ example: '42ab2b7c-8844-41b4-9192-f8caeb01572d.jpg' }),
    mimeType: z.enum(AVATAR_MIME_TYPES),
    fileHash: z.string().length(64).meta({
      example:
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    }),
    size: z.number().int().positive().max(MAX_AVATAR_SIZE_BYTES),
    createdAt: z.date().transform((date) => date.toISOString()),
  })
  .meta({ id: 'Avatar' });

export const AvatarParamsSchema = z
  .object({
    avatarId: z.uuid(),
  })
  .meta({ id: 'AvatarParams' });

export const AvatarUploadBodySchema = z
  .object({
    file: z.string().meta({ format: 'binary' }),
  })
  .meta({ id: 'AvatarUploadBody' });

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
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .meta({ example: 10 }),
    search: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional()
      .meta({ example: 'john' }),
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

export const ActiveUsersQuerySchema = z
  .strictObject({
    minAge: z.coerce.number().int().min(0).max(150).meta({ example: 18 }),
    maxAge: z.coerce.number().int().min(0).max(150).meta({ example: 60 }),
    page: z.coerce.number().int().min(1).default(1).meta({ example: 1 }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .meta({ example: 20 }),
  })
  .refine(({ minAge, maxAge }) => minAge <= maxAge, {
    message: 'minAge must be less than or equal to maxAge',
    path: ['maxAge'],
  })
  .meta({ id: 'ActiveUsersQuery' });

export const ActiveUserSchema = z
  .object({
    id: z.uuid(),
    login: z.string(),
    age: z.number().int(),
    description: z.string(),
    latestAvatar: AvatarSchema,
  })
  .meta({ id: 'ActiveUser' });

export const ActiveUsersResponseSchema = z
  .object({
    items: z.array(ActiveUserSchema),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    pages: z.number().int(),
  })
  .meta({ id: 'ActiveUsersResponse' });

export const UpdateProfileRequestSchema = z
  .strictObject({
    login: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional()
      .meta({ example: 'johnny' }),
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

export const TransferBalanceRequestSchema = z
  .strictObject({
    recipientId: z.uuid().meta({
      example: '1305f2ff-93c7-45aa-bc66-4f74b4ee2596',
    }),
    amountCents: MinorUnitSchema.positive().meta({
      description: 'Transfer amount in cents',
      example: 500,
    }),
  })
  .meta({ id: 'TransferBalanceRequest' });

export type UserProfile = z.input<typeof UserProfileSchema>;
export type Avatar = z.input<typeof AvatarSchema>;
export type AvatarParams = z.infer<typeof AvatarParamsSchema>;
export type UsersListQuery = z.infer<typeof UsersListQuerySchema>;
export type UsersListResponse = z.input<typeof UsersListResponseSchema>;
export type ActiveUsersQuery = z.infer<typeof ActiveUsersQuerySchema>;
export type ActiveUsersResponse = z.input<typeof ActiveUsersResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type TransferBalanceRequest = z.infer<
  typeof TransferBalanceRequestSchema
>;
