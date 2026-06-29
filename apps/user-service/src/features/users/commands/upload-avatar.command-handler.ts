import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { DataSource, IsNull } from 'typeorm';
import { FileEntity } from '../../../providers/files/entities/file.entity';
import { FileHashService } from '../../../providers/files/file-hash.service';
import { S3Service } from '../../../providers/s3/s3.service';
import type { Avatar } from '../contracts/users.contracts';
import { AvatarEntity } from '../entities/avatar.entity';
import { UserEntity } from '../entities/user.entity';
import type { UploadedAvatarFile } from '../pipes/avatar-file-validation.pipe';
import type { AvatarMimeType } from '../avatar.constants';
import { UserCacheService } from '../../../providers/cache/user-cache.service';

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
export class UploadAvatarHandler implements ICommandHandler<
  UploadAvatarCommand,
  Avatar
> {
  private readonly logger = new Logger(UploadAvatarHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
    private readonly cacheService: UserCacheService,
    private readonly fileHashService: FileHashService,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<Avatar> {
    const extension = extensionsByMimeType[command.file.mimetype];
    const storageKey = this.s3Service.createFileName(extension);
    const hashAlgorithm = 'sha256';
    const fileHashPromise = this.fileHashService.hashFile(
      hashAlgorithm,
      command.file.path,
    );
    const uploadPromise = this.s3Service.uploadObject({
      key: storageKey,
      body: createReadStream(command.file.path),
      contentType: command.file.mimetype,
      contentLength: command.file.size,
    });

    try {
      const [fileHash] = await Promise.all([fileHashPromise, uploadPromise]);

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
          throw new ConflictException(
            'A user can have at most five active avatars',
          );
        }

        const file = await manager.save(
          manager.create(FileEntity, {
            storageKey,
            mimeType: command.file.mimetype,
            size: command.file.size,
            hash: fileHash,
            hashAlgorithm,
          }),
        );
        const avatar = await manager.save(
          manager.create(AvatarEntity, {
            userId: command.userId,
            fileId: file.id,
          }),
        );

        avatar.file = file;
        return avatar;
      });

      this.logger.log(
        `Uploaded avatar: userId=${command.userId} avatarId=${avatar.id}`,
      );

      await this.cacheService.invalidateUser(command.userId);
      return this.toResponse(avatar);
    } catch (error: unknown) {
      await this.removeOrphanedObject(storageKey);
      throw error;
    } finally {
      await this.removeTemporaryFile(command.file.path);
    }
  }

  private async removeTemporaryFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to remove temporary avatar file: path=${filePath} reason=${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async removeOrphanedObject(storageKey: string): Promise<void> {
    try {
      await this.s3Service.deleteObject(storageKey);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to remove orphaned avatar object: storageKey=${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private toResponse(avatar: AvatarEntity): Avatar {
    return {
      id: avatar.id,
      fileName: avatar.file.storageKey,
      mimeType: avatar.file.mimeType as AvatarMimeType,
      fileHash: avatar.file.hash,
      size: avatar.file.size,
      createdAt: avatar.createdAt,
    };
  }
}
