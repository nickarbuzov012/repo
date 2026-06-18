import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponseInterceptor } from '../../common/serialization/zod-response.interceptor';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AuthRequestUser } from './auth-request-user';
import { AuthGuard } from './auth.guard';
import {
  AuthResponse,
  AuthResponseSchema,
  LoginRequest,
  MeResponse,
  MeResponseSchema,
  RefreshTokenRequest,
  RefreshTokenRequestSchema,
  RegisterRequest,
  RegisterRequestSchema,
  LoginRequestSchema,
} from './contracts/auth.contracts';
import { LoginUserCommand } from './commands/login-user.command-handler';
import { RefreshTokenCommand } from './commands/refresh-token.command-handler';
import { RegisterUserCommand } from './commands/register-user.command-handler';
import { GetMeQuery } from './queries/get-me.query-handler';
import { TokenPair } from './services/token.service';

interface AuthenticatedHttpRequest {
  header(name: string): string | undefined;
  user: AuthRequestUser;
}

interface CookieResponse {
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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('registration')
  @UseInterceptors(new ZodResponseInterceptor(AuthResponseSchema))
  async registration(
    @Body(new ZodValidationPipe(RegisterRequestSchema)) body: RegisterRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthResponse> {
    const authResponse = await this.commandBus.execute<
      RegisterUserCommand,
      TokenPair
    >(
      new RegisterUserCommand(body),
    );

    setRefreshTokenCookie(response, authResponse.refresh_token);
    return { access_token: authResponse.access_token };
  }

  @Post('login')
  @UseInterceptors(new ZodResponseInterceptor(AuthResponseSchema))
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthResponse> {
    const authResponse = await this.commandBus.execute<
      LoginUserCommand,
      TokenPair
    >(
      new LoginUserCommand(body),
    );

    setRefreshTokenCookie(response, authResponse.refresh_token);
    return { access_token: authResponse.access_token };
  }

  @Post('refresh-token')
  @UseInterceptors(new ZodResponseInterceptor(AuthResponseSchema))
  async refreshToken(
    @Req() request: AuthenticatedHttpRequest,
    @Body(new ZodValidationPipe(RefreshTokenRequestSchema))
    body: RefreshTokenRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthResponse> {
    const refreshToken =
      body.refresh_token ?? readCookie(request.header('cookie'), 'refresh_token');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const authResponse = await this.commandBus.execute<
      RefreshTokenCommand,
      TokenPair
    >(
      new RefreshTokenCommand(refreshToken),
    );

    setRefreshTokenCookie(response, authResponse.refresh_token);
    return { access_token: authResponse.access_token };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @UseInterceptors(new ZodResponseInterceptor(MeResponseSchema))
  async me(@Req() request: AuthenticatedHttpRequest): Promise<MeResponse> {
    return this.queryBus.execute<GetMeQuery, MeResponse>(
      new GetMeQuery(request.user.id),
    );
  }
}

function setRefreshTokenCookie(
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

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function parseTtlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);

  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}
