import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { UserRole } from '../../users/entities/user.entity';

export type TokenType = 'access' | 'refresh';

export interface AuthTokenPayload {
  sub: string;
  roles: UserRole[];
  type: TokenType;
  jti?: string;
  exp: number;
  iat: number;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface RefreshTokenIssue {
  token: string;
  tokenId: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  issueTokenPair(userId: string, roles: UserRole[]): TokenPair {
    const refreshToken = this.issueRefreshToken(userId, roles);

    return {
      access_token: this.issueAccessToken(userId, roles),
      refresh_token: refreshToken.token,
    };
  }

  issueAccessToken(userId: string, roles: UserRole[]): string {
    return this.sign(
      {
        sub: userId,
        roles,
        type: 'access',
      },
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      this.configService.getOrThrow<string>('JWT_ACCESS_TTL'),
    ).token;
  }

  issueRefreshToken(userId: string, roles: UserRole[]): RefreshTokenIssue {
    const tokenId = randomUUID();
    const issued = this.sign(
      {
        sub: userId,
        roles,
        type: 'refresh',
        jti: tokenId,
      },
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      this.configService.getOrThrow<string>('JWT_REFRESH_TTL'),
    );

    return {
      token: issued.token,
      tokenId,
      expiresAt: new Date(issued.expiresAt * 1000),
    };
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    const payload = this.verify(
      token,
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    );

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return payload;
  }

  verifyRefreshToken(token: string): AuthTokenPayload {
    const payload = this.verify(
      token,
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    );

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid token type');
    }

    return payload;
  }

  private sign(
    payload: Omit<AuthTokenPayload, 'exp' | 'iat'>,
    secret: string,
    ttl: string,
  ): { token: string; expiresAt: number } {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + parseTtlSeconds(ttl);
    const header = encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
    const body = encodeBase64Url({ ...payload, iat: now, exp: expiresAt });
    const signature = sign(`${header}.${body}`, secret);

    return {
      token: `${header}.${body}.${signature}`,
      expiresAt,
    };
  }

  private verify(token: string, secret: string): AuthTokenPayload {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token');
    }

    const [header, body, signature] = parts;
    const expectedSignature = sign(`${header}.${body}`, secret);

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
}

function encodeBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function parseTtlSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);

  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 60 * 60;
  return value * 24 * 60 * 60;
}
