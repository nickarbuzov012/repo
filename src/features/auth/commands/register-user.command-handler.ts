import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthResponse, RegisterRequest } from '../contracts/auth.contracts';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { UserEntity, UserRole } from '../../users/entities/user.entity';

export class RegisterUserCommand {
  constructor(public readonly payload: RegisterRequest) {}
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand, AuthResponse>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResponse> {
    const payload = normalizeRegisterRequest(command.payload);

    const existingUser = await this.usersRepository.findOne({
      where: [{ login: payload.login }, { email: payload.email }],
      withDeleted: true,
    });

    if (existingUser) {
      throw new ConflictException('User with this login or email already exists');
    }

    const user = this.usersRepository.create({
      ...payload,
      role: UserRole.User,
      passwordHash: await this.passwordService.hash(payload.password),
    });

    await this.usersRepository.save(user);

    return this.tokenService.issueTokenPair(user.id, user.role);
  }
}

function normalizeRegisterRequest(payload: RegisterRequest): RegisterRequest {
  const login = payload.login?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password;
  const age = Number(payload.age);
  const description = payload.description?.trim();

  if (!login || login.length > 64) {
    throw new BadRequestException('Login is required and must be up to 64 chars');
  }

  if (!email || email.length > 320 || !email.includes('@')) {
    throw new BadRequestException('Valid email is required');
  }

  if (!password || password.length < 6) {
    throw new BadRequestException('Password must contain at least 6 chars');
  }

  if (!Number.isInteger(age) || age < 1 || age > 150) {
    throw new BadRequestException('Age must be an integer from 1 to 150');
  }

  if (!description || description.length > 1000) {
    throw new BadRequestException(
      'Description is required and must be up to 1000 chars',
    );
  }

  return {
    login,
    email,
    password,
    age,
    description,
  };
}
