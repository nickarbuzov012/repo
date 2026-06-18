import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterRequest } from '../contracts/auth.contracts';
import { PasswordService } from '../services/password.service';
import { TokenPair, TokenService } from '../services/token.service';
import { UserEntity, UserRole } from '../../users/entities/user.entity';

export class RegisterUserCommand {
  constructor(public readonly payload: RegisterRequest) {}
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand, TokenPair>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<TokenPair> {
    const payload = command.payload;

    const existingUser = await this.usersRepository.findOne({
      where: [{ login: payload.login }, { email: payload.email }],
      withDeleted: true,
    });

    if (existingUser) {
      throw new ConflictException('User with this login or email already exists');
    }

    const user = this.usersRepository.create({
      ...payload,
      roles: [UserRole.User],
      passwordHash: await this.passwordService.hash(payload.password),
    });

    await this.usersRepository.save(user);

    return this.tokenService.issueTokenPair(user.id, user.roles);
  }
}
