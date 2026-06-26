import { parseTtlMs } from '../../../common/utils/ttl';

export interface CookieResponse {
  cookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: 'strict';
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ): void;
}

export function setRefreshTokenCookie(
  response: CookieResponse,
  refreshToken: string,
): void {
  response.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/refresh-token',
    maxAge: parseTtlMs(process.env.JWT_REFRESH_TTL ?? '7d'),
  });
}
