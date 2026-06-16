import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { OpenAPIObject } from '@nestjs/swagger';
import { z } from 'zod';
import {
  AuthResponseSchema,
  LoginRequestSchema,
  MeResponseSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,
} from '../../features/auth/contracts/auth.contracts';
import { HealthCheckResponseSchema } from '../../health/health.contracts';

const registry = new OpenAPIRegistry();

const ErrorResponseSchema = z
  .object({
    statusCode: z.number().int(),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string().optional(),
  })
  .meta({ id: 'ErrorResponse' });

registry.registerComponent('securitySchemes', 'bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

function jsonBody(schema: z.ZodType) {
  return {
    required: true,
    content: { 'application/json': { schema } },
  };
}

function jsonResponse(description: string, schema: z.ZodType) {
  return {
    description,
    content: { 'application/json': { schema } },
  };
}

registry.registerPath({
  method: 'post',
  path: '/api/auth/registration',
  tags: ['auth'],
  request: { body: jsonBody(RegisterRequestSchema) },
  responses: {
    201: jsonResponse('User registered', AuthResponseSchema),
    400: jsonResponse('Invalid request', ErrorResponseSchema),
    409: jsonResponse('Login or email already exists', ErrorResponseSchema),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['auth'],
  request: { body: jsonBody(LoginRequestSchema) },
  responses: {
    201: jsonResponse('Authenticated', AuthResponseSchema),
    400: jsonResponse('Invalid request', ErrorResponseSchema),
    401: jsonResponse('Invalid credentials', ErrorResponseSchema),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/refresh-token',
  tags: ['auth'],
  request: { body: jsonBody(RefreshTokenRequestSchema) },
  responses: {
    201: jsonResponse('Token pair refreshed', AuthResponseSchema),
    400: jsonResponse('Invalid request', ErrorResponseSchema),
    401: jsonResponse('Invalid or revoked refresh token', ErrorResponseSchema),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['auth'],
  security: [{ bearer: [] }],
  responses: {
    200: jsonResponse('Current user', MeResponseSchema),
    401: jsonResponse('Access token is missing or invalid', ErrorResponseSchema),
    404: jsonResponse('User not found', ErrorResponseSchema),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['health'],
  responses: {
    200: jsonResponse('Application health', HealthCheckResponseSchema),
  },
});

export function createOpenApiDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Users API',
      description: 'REST API for users, auth and profiles',
      version: '0.1.0',
    },
  }) as OpenAPIObject;
}
