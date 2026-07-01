import { z } from '../../../infrastructure/documentation/zod';
import { UserRole } from '../../users/entities/user.entity';
import { MinorUnitSchema } from '../../../common/validation/minor-unit.schema';

export const RegisterRequestSchema = z
  .strictObject({
    login: z.string().trim().min(1).max(64).meta({ example: 'john' }),
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((email) => email.toLowerCase())
      .meta({ example: 'john@example.com' }),
    password: z.string().min(6).meta({ example: 'password123' }),
    age: z.number().int().min(1).max(150).meta({ example: 25 }),
    description: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .meta({ example: 'About John' }),
  })
  .meta({ id: 'RegisterRequest' });

export const LoginRequestSchema = z
  .strictObject({
    login: z.string().trim().min(1).max(64).meta({ example: 'john' }),
    password: z.string().min(1).meta({ example: 'password123' }),
  })
  .meta({ id: 'LoginRequest' });

export const RefreshTokenRequestSchema = z
  .strictObject({
    refresh_token: z
      .string()
      .min(1)
      .optional()
      .meta({ example: 'refresh.jwt.token' }),
  })
  .meta({ id: 'RefreshTokenRequest' });

export const RefreshTokenCookieSchema = z
  .object({
    refresh_token: z.string().min(1).meta({ example: 'refresh.jwt.token' }),
  })
  .meta({ id: 'RefreshTokenCookie' });

export const AuthResponseSchema = z
  .object({
    access_token: z.string().meta({ example: 'access.jwt.token' }),
  })
  .meta({ id: 'AuthResponse' });

export const MeResponseSchema = z
  .object({
    id: z.uuid().meta({ example: '9f8c7f74-4eb1-4a39-85f6-9bce59f61a40' }),
    login: z.string().meta({ example: 'john' }),
    email: z.email().meta({ example: 'john@example.com' }),
    age: z.number().int().meta({ example: 25 }),
    description: z.string().meta({ example: 'About John' }),
    balance: MinorUnitSchema,
    roles: z.array(z.enum(UserRole)).meta({ example: [UserRole.User] }),
    createdAt: z.date().transform((date) => date.toISOString()),
    updatedAt: z.date().transform((date) => date.toISOString()),
  })
  .meta({ id: 'MeResponse' });

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type MeResponse = z.input<typeof MeResponseSchema>;
