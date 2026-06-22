import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Service } from '../../../providers/s3/s3.service';
import { AvatarEntity } from '../entities/avatar.entity';
import { CacheService } from '../../../providers/cache/cache.service';

export class DeleteAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly avatarId: string,
  ) {}
}

@CommandHandler(DeleteAvatarCommand)
export class DeleteAvatarHandler
  implements ICommandHandler<DeleteAvatarCommand, void>
{
  private readonly logger = new Logger(DeleteAvatarHandler.name);

  constructor(
    @InjectRepository(AvatarEntity)
    private readonly avatarsRepository: Repository<AvatarEntity>,
    private readonly s3Service: S3Service,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: DeleteAvatarCommand): Promise<void> {
    const avatar = await this.avatarsRepository.findOne({
      where: { id: command.avatarId, userId: command.userId },
    });

    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    await this.avatarsRepository.softDelete({ id: avatar.id });
    await this.cacheService.invalidateUser(command.userId);

    try {
      await this.s3Service.deleteObject(avatar.fileName);
    } catch (error: unknown) {
      this.logger.error(
        `Avatar was soft-deleted but object cleanup failed: avatarId=${avatar.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(
      `Deleted avatar: userId=${command.userId} avatarId=${avatar.id}`,
    );
  }
}
