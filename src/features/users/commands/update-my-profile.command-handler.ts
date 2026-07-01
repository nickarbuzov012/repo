import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import {
  UpdateProfileRequest,
  UserProfile,
} from '../contracts/users.contracts';
import { UserEntity } from '../entities/user.entity';
import { toUserProfile } from '../users.mapper';
import { PasswordService } from '../../auth/services/password.service';
import { UserCacheService } from '../../../providers/cache/user-cache.service';

export class UpdateMyProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly payload: UpdateProfileRequest,
  ) {}
}

@CommandHandler(UpdateMyProfileCommand)
export class UpdateMyProfileHandler implements ICommandHandler<
  UpdateMyProfileCommand,
  UserProfile
> {
  private readonly logger = new Logger(UpdateMyProfileHandler.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly passwordService: PasswordService,
    private readonly cacheService: UserCacheService,
  ) {}

  async execute(command: UpdateMyProfileCommand): Promise<UserProfile> {
    const user = await this.usersRepository.findOne({
      where: { id: command.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (command.payload.login || command.payload.email) {
      const duplicateUserWhere: FindOptionsWhere<UserEntity>[] = [];

      if (command.payload.login) {
        duplicateUserWhere.push({
          login: command.payload.login,
          id: Not(command.userId),
        });
      }

      if (command.payload.email) {
        duplicateUserWhere.push({
          email: command.payload.email,
          id: Not(command.userId),
        });
      }

      const existingUser = await this.usersRepository.findOne({
        where: duplicateUserWhere,
        withDeleted: true,
      });

      if (existingUser) {
        throw new ConflictException(
          'User with this login or email already exists',
        );
      }
    }

    const { password, ...profilePayload } = command.payload;

    this.usersRepository.merge(user, profilePayload);

    if (password !== undefined) {
      user.passwordHash = await this.passwordService.hash(password);
    }

    const profile = toUserProfile(await this.usersRepository.save(user));
    await this.cacheService.invalidateUser(command.userId);
    this.logger.log(`Updated profile: userId=${command.userId}`);
    return profile;
  }
}
