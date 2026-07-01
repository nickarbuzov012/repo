import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { type OpenAPIObject } from '@nestjs/swagger';
import { z } from './zod';
import {
  type ZResponseConfig,
  type ZRouteConfig,
  zRegistry,
} from '../validation/z-registry';

type RouteRequest = NonNullable<RouteConfig['request']>;
type RouteParameter = NonNullable<RouteRequest['query']>;
type RouteBody = NonNullable<RouteRequest['body']>;
type RouteResponse = NonNullable<RouteConfig['responses']>[string];

const ErrorResponseSchema = z
  .object({
    statusCode: z.number().int(),
    message: z.union([
      z.string(),
      z.array(z.string()),
      z.object({
        message: z.string(),
        errors: z.array(
          z.object({
            path: z.string(),
            message: z.string(),
          }),
        ),
      }),
    ]),
    error: z.string().optional(),
  })
  .meta({ id: 'ErrorResponse' });

function jsonBody(schema: z.ZodType): RouteBody {
  return {
    required: true,
    content: { 'application/json': { schema } },
  };
}

function multipartBody(schema: z.ZodType): RouteBody {
  return {
    required: true,
    content: { 'multipart/form-data': { schema } },
  };
}

function request(config: ZRouteConfig): RouteConfig['request'] {
  const result: RouteConfig['request'] = {};

  if (config.body) {
    result.body = jsonBody(config.body);
  }

  if (config.multipartBody) {
    result.body = multipartBody(config.multipartBody);
  }

  if (config.query) {
    result.query = config.query as RouteParameter;
  }

  if (config.params) {
    result.params = config.params as RouteParameter;
  }

  if (config.cookies) {
    result.cookies = config.cookies as RouteParameter;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function jsonResponse(description: string, schema: unknown): RouteResponse {
  return {
    description,
    content: { 'application/json': { schema: schema as z.ZodType } },
  };
}

export function createOpenApiDocument(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  for (const [route, config] of Object.entries(zRegistry)) {
    registerZRoute(registry, route, config);
  }

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

function registerZRoute(
  registry: OpenAPIRegistry,
  route: string,
  config: ZRouteConfig,
): void {
  const [method, ...pathParts] = route.split(' ');
  const path = `/api${pathParts.join(' ')}`;
  const responses = createResponses(config);

  registry.registerPath({
    method: method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: toOpenApiPath(path),
    tags: config.tags,
    summary: config.summary,
    request: request(config),
    responses,
    security: config.auth
      ? [{ bearerAuth: [] }]
      : config.authOptional
        ? [{ bearerAuth: [] }, {}]
        : undefined,
  });
}

function createResponses(config: ZRouteConfig): RouteConfig['responses'] {
  const responses: RouteConfig['responses'] = {};

  for (const item of toResponseList(config.res)) {
    const status = String(item.status ?? 200);
    responses[status] = jsonResponse(
      item.description ?? 'Success',
      item.schema,
    );
  }

  responses['400'] = jsonResponse('Validation error', ErrorResponseSchema);

  if (config.auth || config.authOptional || config.unauthorized) {
    responses['401'] = jsonResponse('Unauthorized', ErrorResponseSchema);
  }

  return responses;
}

function toResponseList(input: ZRouteConfig['res']): ZResponseConfig[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'object' && 'schema' in input) {
    return [input as ZResponseConfig];
  }

  return [{ status: 200, schema: input }];
}

function toOpenApiPath(path: string): string {
  return path.replace(/:([^/]+)/g, '{$1}');
}
