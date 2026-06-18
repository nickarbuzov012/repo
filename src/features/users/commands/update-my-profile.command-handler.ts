import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import {
  UpdateProfileRequest,
  UserProfile,
} from '../contracts/users.contracts';
import { UserEntity } from '../entities/user.entity';
import { toUserProfile } from '../users.mapper';
import { PasswordService } from '../../auth/services/password.service';

export class UpdateMyProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly payload: UpdateProfileRequest,
  ) {}
}

@CommandHandler(UpdateMyProfileCommand)
export class UpdateMyProfileHandler
  implements ICommandHandler<UpdateMyProfileCommand, UserProfile>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(command: UpdateMyProfileCommand): Promise<UserProfile> {
    const user = await this.usersRepository.findOne({
      where: { id: command.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (command.payload.login || command.payload.email) {
      const existingUser = await this.usersRepository.findOne({
        where: [
          ...(command.payload.login
            ? [{ login: command.payload.login, id: Not(command.userId) }]
            : []),
          ...(command.payload.email
            ? [{ email: command.payload.email, id: Not(command.userId) }]
            : []),
        ],
        withDeleted: true,
      });

      if (existingUser) {
        throw new ConflictException('User with this login or email already exists');
      }
    }

    if (command.payload.login !== undefined) user.login = command.payload.login;
    if (command.payload.email !== undefined) user.email = command.payload.email;
    if (command.payload.age !== undefined) user.age = command.payload.age;
    if (command.payload.description !== undefined) {
      user.description = command.payload.description;
    }
    if (command.payload.password !== undefined) {
      user.passwordHash = await this.passwordService.hash(command.payload.password);
    }

    return toUserProfile(await this.usersRepository.save(user));
  }
}
