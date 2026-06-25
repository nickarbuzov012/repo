import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { zRegistry } from './z-registry';

const GLOBAL_PREFIX = 'api';

type Entry = {
  method: string;
  routePattern: string;
  conf: any;
  match: (path: string) => false | Record<string, string>;
};

const index: Entry[] = Object.entries(zRegistry).map(([key, conf]) => {
  const [method, ...rest] = key.split(' ');
  const routePattern = rest.join(' ').trim();

  return {
    method: method.toUpperCase(),
    routePattern,
    conf,
    match: createMatcher(routePattern),
  };
});

@Injectable()
export class ZodRouteValidationMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: (error?: unknown) => void): void {
    try {
      const method = String(req.method || '').toUpperCase();
      const path = stripPrefix(req.path || '/', GLOBAL_PREFIX);
      const entry = index.find(
        (item) => item.method === method && item.match(path) !== false,
      );

      if (!entry) {
        next();
        return;
      }

      const params = entry.match(path);
      if (params) {
        Object.assign(req.params, params);
      }

      const { conf } = entry;

      if (conf.params) {
        Object.assign(req.params, conf.params.parse(req.params ?? {}));
      }

      if (conf.query) {
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
    } catch (error: any) {
      next(
        new BadRequestException({
          message: 'Validation failed',
          errors: (error?.issues ?? error?.errors ?? []).map((issue: any) => ({
            path: Array.isArray(issue.path) ? issue.path.join('.') : '',
            message: issue.message,
          })),
        }),
      );
    }
  }
}

function stripPrefix(path: string, prefix: string): string {
  const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return path.startsWith(normalizedPrefix)
    ? path.slice(normalizedPrefix.length) || '/'
    : path;
}

function createMatcher(pattern: string): Entry['match'] {
  const patternParts = pattern.split('/').filter(Boolean);

  return (path: string) => {
    const pathParts = path.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    const params: Record<string, string> = {};

    for (let index = 0; index < patternParts.length; index += 1) {
      const patternPart = patternParts[index];
      const pathPart = pathParts[index];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = decodeURIComponent(pathPart);
        continue;
      }

      if (patternPart !== pathPart) {
        return false;
      }
    }

    return params;
  };
}
