import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AVATAR_MIME_TYPES, type AvatarMimeType } from '../avatar.constants';

export const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;

const allowedMimeTypes = new Set<string>(AVATAR_MIME_TYPES);

interface UploadedFileCandidate {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadedAvatarFile extends UploadedFileCandidate {
  mimetype: AvatarMimeType;
}

@Injectable()
export class AvatarFileValidationPipe implements PipeTransform<
  UploadedFileCandidate | undefined,
  UploadedAvatarFile
> {
  transform(file: UploadedFileCandidate | undefined): UploadedAvatarFile {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG avatars are supported');
    }

    if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException(
        'Avatar size must be between 1 byte and 10 MB',
      );
    }

    return file as UploadedAvatarFile;
  }
}
