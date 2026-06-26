import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { LoginUserHandler } from './commands/login-user.command-handler';
import { RefreshTokenHandler } from './commands/refresh-token.command-handler';
import { RegisterUserHandler } from './commands/register-user.command-handler';
import { RevokedRefreshTokenEntity } from './entities/revoked-refresh-token.entity';
import { GetMeHandler } from './queries/get-me.query-handler';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

const commandHandlers = [
  RegisterUserHandler,
  LoginUserHandler,
  RefreshTokenHandler,
];

const queryHandlers = [GetMeHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([UserEntity, RevokedRefreshTokenEntity]),
  ],
  controllers: [AuthController],
  providers: [
    PasswordService,
    TokenService,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [TypeOrmModule, PasswordService, TokenService],
})
export class AuthModule {}
