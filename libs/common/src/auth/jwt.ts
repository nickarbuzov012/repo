import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

export type AuthTokenType = 'access' | 'refresh';

export interface AuthTokenPayload {
  sub: string;
  roles: string[];
  type: AuthTokenType;
  jti?: string;
  exp: number;
  iat: number;
}

export function signJwtToken(
  payload: Omit<AuthTokenPayload, 'exp' | 'iat'>,
  secret: string,
  ttlSeconds: number,
): { token: string; expiresAt: number } {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;
  const header = encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
  const body = encodeBase64Url({ ...payload, iat: now, exp: expiresAt });
  const signature = signValue(`${header}.${body}`, secret);

  return {
    token: `${header}.${body}.${signature}`,
    expiresAt,
  };
}

export function verifyJwtToken(
  token: string,
  secret: string,
): AuthTokenPayload {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new UnauthorizedException('Invalid token');
  }

  const [header, body, signature] = parts;
  const expectedSignature = signValue(`${header}.${body}`, secret);

  if (signature !== expectedSignature) {
    throw new UnauthorizedException('Invalid token');
  }

  const payload = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8'),
  ) as AuthTokenPayload;

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('Token expired');
  }

  return payload;
}

export function verifyAccessToken(
  token: string,
  secret: string,
): AuthTokenPayload {
  const payload = verifyJwtToken(token, secret);

  if (payload.type !== 'access') {
    throw new UnauthorizedException('Invalid token type');
  }

  return payload;
}

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new UnauthorizedException('Missing authorization header');
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new UnauthorizedException('Invalid authorization header');
  }

  return token;
}

function encodeBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
