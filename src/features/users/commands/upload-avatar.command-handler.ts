import {
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource, IsNull } from 'typeorm';
import { S3Service } from '../../../providers/s3/s3.service';
import type { Avatar } from '../contracts/users.contracts';
import { AvatarEntity } from '../entities/avatar.entity';
import { UserEntity } from '../entities/user.entity';
import type { UploadedAvatarFile } from '../pipes/avatar-file-validation.pipe';
import type { AvatarMimeType } from '../avatar.constants';

const MAX_ACTIVE_AVATARS = 5;

const extensionsByMimeType: Record<AvatarMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export class UploadAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly file: UploadedAvatarFile,
  ) {}
}

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler
  implements ICommandHandler<UploadAvatarCommand, Avatar>
{
  private readonly logger = new Logger(UploadAvatarHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<Avatar> {
    const extension = extensionsByMimeType[command.file.mimetype];
    const fileName = this.s3Service.createFileName(extension);

    await this.s3Service.uploadObject({
      key: fileName,
      body: command.file.buffer,
      contentType: command.file.mimetype,
    });

    try {
      const avatar = await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(UserEntity, {
          where: { id: command.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const activeAvatarCount = await manager.count(AvatarEntity, {
          where: { userId: command.userId, deletedAt: IsNull() },
        });

        if (activeAvatarCount >= MAX_ACTIVE_AVATARS) {
          throw new ConflictException('A user can have at most five active avatars');
        }

        return manager.save(
          manager.create(AvatarEntity, {
            userId: command.userId,
            fileName,
            mimeType: command.file.mimetype,
            size: command.file.size,
          }),
        );
      });

      this.logger.log(
        `Uploaded avatar: userId=${command.userId} avatarId=${avatar.id}`,
      );

      return this.toResponse(avatar);
    } catch (error: unknown) {
      await this.removeOrphanedObject(fileName);
      throw error;
    }
  }

  private async removeOrphanedObject(fileName: string): Promise<void> {
    try {
      await this.s3Service.deleteObject(fileName);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to remove orphaned avatar object: fileName=${fileName}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private toResponse(avatar: AvatarEntity): Avatar {
    return {
      id: avatar.id,
      fileName: avatar.fileName,
      mimeType: avatar.mimeType,
      size: avatar.size,
      createdAt: avatar.createdAt,
    };
  }
}
