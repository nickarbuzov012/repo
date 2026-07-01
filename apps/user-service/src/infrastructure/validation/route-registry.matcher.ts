import { type ZRouteConfig, zRegistry } from './z-registry';

export const GLOBAL_PREFIX = 'api';

export type ZRouteEntry = {
  method: string;
  routePattern: string;
  conf: ZRouteConfig;
  match: (path: string) => false | Record<string, string>;
};

export const zRouteIndex: ZRouteEntry[] = Object.entries(zRegistry).map(
  ([key, conf]) => {
    const [method, ...rest] = key.split(' ');
    const routePattern = rest.join(' ').trim();

    return {
      method: method.toUpperCase(),
      routePattern,
      conf,
      match: createMatcher(routePattern),
    };
  },
);

export function findZRouteEntry(
  method: string,
  path: string,
): { entry: ZRouteEntry; params: Record<string, string> } | null {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = stripPrefix(path || '/', GLOBAL_PREFIX);

  for (const entry of zRouteIndex) {
    if (entry.method !== normalizedMethod) {
      continue;
    }

    const params = entry.match(normalizedPath);

    if (params !== false) {
      return { entry, params };
    }
  }

  return null;
}

export function stripPrefix(path: string, prefix: string): string {
  const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return path.startsWith(normalizedPrefix)
    ? path.slice(normalizedPrefix.length) || '/'
    : path;
}

function createMatcher(pattern: string): ZRouteEntry['match'] {
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
