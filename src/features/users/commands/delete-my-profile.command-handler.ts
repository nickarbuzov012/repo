import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { CacheService } from '../../../providers/cache/cache.service';

export class DeleteMyProfileCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(DeleteMyProfileCommand)
export class DeleteMyProfileHandler
  implements ICommandHandler<DeleteMyProfileCommand, void>
{
  private readonly logger = new Logger(DeleteMyProfileHandler.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: DeleteMyProfileCommand): Promise<void> {
    const result = await this.usersRepository.softDelete({ id: command.userId });

    if (!result.affected) {
      throw new NotFoundException('User not found');
    }

    await this.cacheService.invalidateUser(command.userId);
    this.logger.log(`Deleted profile: userId=${command.userId}`);
  }
}
