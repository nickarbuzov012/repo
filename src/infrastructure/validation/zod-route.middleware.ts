import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { findZRouteEntry } from './route-registry.matcher';

interface ZodValidationRequest {
  method?: string;
  path?: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

interface ValidationIssue {
  path?: Array<string | number>;
  message: string;
}

interface ValidationError {
  issues?: ValidationIssue[];
  errors?: ValidationIssue[];
}

@Injectable()
export class ZodRouteValidationMiddleware implements NestMiddleware {
  use(
    req: ZodValidationRequest,
    _res: unknown,
    next: (error?: unknown) => void,
  ): void {
    try {
      const method = String(req.method || '').toUpperCase();
      const route = findZRouteEntry(method, req.path || '/');

      if (!route) {
        next();
        return;
      }

      req.params ??= {};
      Object.assign(req.params, route.params);

      const { conf } = route.entry;

      if (conf.params) {
        Object.assign(req.params, conf.params.parse(req.params ?? {}));
      }

      if (conf.query) {
        req.query ??= {};
        Object.assign(req.query, conf.query.parse(req.query ?? {}));
      }

      if (conf.body) {
        const parsedBody = conf.body.parse(req.body ?? {});
        req.body =
          req.body && typeof req.body === 'object'
            ? Object.assign(req.body, parsedBody)
            : parsedBody;
      }

      next();
    } catch (error: unknown) {
      const validationError = error as ValidationError;
      const issues = validationError.issues ?? validationError.errors ?? [];

      next(
        new BadRequestException({
          message: 'Validation failed',
          errors: issues.map((issue) => ({
            path: Array.isArray(issue.path) ? issue.path.join('.') : '',
            message: issue.message,
          })),
        }),
      );
    }
  }
}
