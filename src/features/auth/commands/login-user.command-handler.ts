import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthResponse, LoginRequest } from '../contracts/auth.contracts';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { UserEntity } from '../../users/entities/user.entity';

export class LoginUserCommand {
  constructor(public readonly payload: LoginRequest) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserHandler
  implements ICommandHandler<LoginUserCommand, AuthResponse>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthResponse> {
    const login = command.payload.login?.trim();
    const password = command.payload.password;

    if (!login || !password) {
      throw new BadRequestException('Login and password are required');
    }

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

    return this.tokenService.issueTokenPair(user.id, user.role);
  }
}
