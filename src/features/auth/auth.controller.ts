import {
  Body,
  Controller,
  Get,
  Post,
  Req,
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
  LoginRequestSchema,
  MeResponse,
  MeResponseSchema,
  RefreshTokenRequest,
  RefreshTokenRequestSchema,
  RegisterRequest,
  RegisterRequestSchema,
} from './contracts/auth.contracts';
import { LoginUserCommand } from './commands/login-user.command-handler';
import { RefreshTokenCommand } from './commands/refresh-token.command-handler';
import { RegisterUserCommand } from './commands/register-user.command-handler';
import { GetMeQuery } from './queries/get-me.query-handler';

interface AuthenticatedHttpRequest {
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
  ): Promise<AuthResponse> {
    return this.commandBus.execute<RegisterUserCommand, AuthResponse>(
      new RegisterUserCommand(body),
    );
  }

  @Post('login')
  @UseInterceptors(new ZodResponseInterceptor(AuthResponseSchema))
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequest,
  ): Promise<AuthResponse> {
    return this.commandBus.execute<LoginUserCommand, AuthResponse>(
      new LoginUserCommand(body),
    );
  }

  @Post('refresh-token')
  @UseInterceptors(new ZodResponseInterceptor(AuthResponseSchema))
  async refreshToken(
    @Body(new ZodValidationPipe(RefreshTokenRequestSchema))
    body: RefreshTokenRequest,
  ): Promise<AuthResponse> {
    return this.commandBus.execute<RefreshTokenCommand, AuthResponse>(
      new RefreshTokenCommand(body),
    );
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
