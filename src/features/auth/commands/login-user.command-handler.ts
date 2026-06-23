import { Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginRequest } from '../contracts/auth.contracts';
import { PasswordService } from '../services/password.service';
import { TokenPair, TokenService } from '../services/token.service';
import { UserEntity } from '../../users/entities/user.entity';

export class LoginUserCommand {
  constructor(public readonly payload: LoginRequest) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserHandler
  implements ICommandHandler<LoginUserCommand, TokenPair>
{
  private readonly logger = new Logger(LoginUserHandler.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginUserCommand): Promise<TokenPair> {
    const login = command.payload.login;
    const password = command.payload.password;

    const user = await this.usersRepository.findOne({ where: { login } });

    if (!user) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const isPasswordValid = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid login or password');
    }

    this.logger.log(`Logged in user: userId=${user.id}`);

    return this.tokenService.issueTokenPair(user.id, user.roles);
  }
}
