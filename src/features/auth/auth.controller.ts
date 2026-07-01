import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponseInterceptor } from '../../common/serialization/zod-response.interceptor';
import { readCookie } from '../../common/utils/cookies';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AuthRequestUser } from './auth-request-user';
import { LoginUserCommand } from './commands/login-user.command-handler';
import { RefreshTokenCommand } from './commands/refresh-token.command-handler';
import { RegisterUserCommand } from './commands/register-user.command-handler';
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
import {
  CookieResponse,
  setRefreshTokenCookie,
} from './helpers/refresh-token-cookie.helper';
import { GetMeQuery } from './queries/get-me.query-handler';
import { TokenPair } from './services/token.service';

interface AuthenticatedHttpRequest {
  header(name: string): string | undefined;
  user: AuthRequestUser;
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
    >(new RegisterUserCommand(body));

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
    >(new LoginUserCommand(body));

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
      body.refresh_token ??
      readCookie(request.header('cookie'), 'refresh_token');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const authResponse = await this.commandBus.execute<
      RefreshTokenCommand,
      TokenPair
    >(new RefreshTokenCommand(refreshToken));

    setRefreshTokenCookie(response, authResponse.refresh_token);
    return { access_token: authResponse.access_token };
  }

  @Get('me')
  @UseInterceptors(new ZodResponseInterceptor(MeResponseSchema))
  async me(@Req() request: AuthenticatedHttpRequest): Promise<MeResponse> {
    return this.queryBus.execute<GetMeQuery, MeResponse>(
      new GetMeQuery(request.user.id),
    );
  }
}
