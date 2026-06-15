import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthRequestUser } from './auth-request-user';
import { AuthGuard } from './auth.guard';
import {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RefreshTokenRequest,
  RegisterRequest,
} from './contracts/auth.contracts';
import { LoginUserCommand } from './commands/login-user.command-handler';
import { RefreshTokenCommand } from './commands/refresh-token.command-handler';
import { RegisterUserCommand } from './commands/register-user.command-handler';
import { GetMeQuery } from './queries/get-me.query-handler';

interface AuthenticatedHttpRequest {
  user: AuthRequestUser;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('registration')
  @ApiBody({
    schema: {
      example: {
        login: 'john',
        email: 'john@example.com',
        password: 'password123',
        age: 25,
        description: 'About John',
      },
    },
  })
  @ApiOkResponse({
    schema: {
      example: {
        access_token: 'access.jwt.token',
        refresh_token: 'refresh.jwt.token',
      },
    },
  })
  async registration(@Body() body: RegisterRequest): Promise<AuthResponse> {
    return this.commandBus.execute<RegisterUserCommand, AuthResponse>(
      new RegisterUserCommand(body),
    );
  }

  @Post('login')
  @ApiBody({
    schema: {
      example: {
        login: 'john',
        password: 'password123',
      },
    },
  })
  @ApiOkResponse({
    schema: {
      example: {
        access_token: 'access.jwt.token',
        refresh_token: 'refresh.jwt.token',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid login or password' })
  async login(@Body() body: LoginRequest): Promise<AuthResponse> {
    return this.commandBus.execute<LoginUserCommand, AuthResponse>(
      new LoginUserCommand(body),
    );
  }

  @Post('refresh-token')
  @ApiBody({
    schema: {
      example: {
        refresh_token: 'refresh.jwt.token',
      },
    },
  })
  @ApiOkResponse({
    schema: {
      example: {
        access_token: 'new.access.jwt.token',
        refresh_token: 'new.refresh.jwt.token',
      },
    },
  })
  async refreshToken(@Body() body: RefreshTokenRequest): Promise<AuthResponse> {
    return this.commandBus.execute<RefreshTokenCommand, AuthResponse>(
      new RefreshTokenCommand(body),
    );
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        id: '9f8c7f74-4eb1-4a39-85f6-9bce59f61a40',
        login: 'john',
        email: 'john@example.com',
        age: 25,
        description: 'About John',
        role: 'user',
        createdAt: '2026-06-12T00:00:00.000Z',
        updatedAt: '2026-06-12T00:00:00.000Z',
      },
    },
  })
  async me(@Req() request: AuthenticatedHttpRequest): Promise<MeResponse> {
    return this.queryBus.execute<GetMeQuery, MeResponse>(
      new GetMeQuery(request.user.id),
    );
  }
}
