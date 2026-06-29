import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diskStorage } from 'multer';
import { ZodResponseInterceptor } from '../../common/serialization/zod-response.interceptor';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AuthRequestUser } from '../auth/auth-request-user';
import {
  ActiveUsersQuery,
  ActiveUsersQuerySchema,
  ActiveUsersResponse,
  ActiveUsersResponseSchema,
  Avatar,
  AvatarParams,
  AvatarParamsSchema,
  AvatarSchema,
  TransferBalanceRequest,
  TransferBalanceRequestSchema,
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
  UserProfile,
  UserProfileSchema,
  UsersListQuery,
  UsersListQuerySchema,
  UsersListResponse,
  UsersListResponseSchema,
} from './contracts/users.contracts';
import { DeleteAvatarCommand } from './commands/delete-avatar.command-handler';
import { DeleteMyProfileCommand } from './commands/delete-my-profile.command-handler';
import { TransferBalanceCommand } from './commands/transfer-balance.command-handler';
import { UpdateMyProfileCommand } from './commands/update-my-profile.command-handler';
import { UploadAvatarCommand } from './commands/upload-avatar.command-handler';
import { ListUsersQuery } from './queries/list-users.query-handler';
import { ListActiveUsersQuery } from './queries/list-active-users.query-handler';
import {
  AvatarFileValidationPipe,
  MAX_AVATAR_SIZE_BYTES,
  UploadedAvatarFile,
} from './pipes/avatar-file-validation.pipe';

interface AuthenticatedHttpRequest {
  user: AuthRequestUser;
}

const avatarUploadTempDirectory = join(tmpdir(), 'users-api-avatar-uploads');
mkdirSync(avatarUploadTempDirectory, { recursive: true });

@Controller()
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('users/active')
  @UseInterceptors(new ZodResponseInterceptor(ActiveUsersResponseSchema))
  async listActiveUsers(
    @Query(new ZodValidationPipe(ActiveUsersQuerySchema))
    query: ActiveUsersQuery,
  ): Promise<ActiveUsersResponse> {
    return this.queryBus.execute<ListActiveUsersQuery, ActiveUsersResponse>(
      new ListActiveUsersQuery(query),
    );
  }

  @Get('users')
  @UseInterceptors(new ZodResponseInterceptor(UsersListResponseSchema))
  async listUsers(
    @Query(new ZodValidationPipe(UsersListQuerySchema)) query: UsersListQuery,
  ): Promise<UsersListResponse> {
    return this.queryBus.execute<ListUsersQuery, UsersListResponse>(
      new ListUsersQuery(query),
    );
  }

  @Post('users/transfer')
  @HttpCode(204)
  async transferBalance(
    @Req() request: AuthenticatedHttpRequest,
    @Body(new ZodValidationPipe(TransferBalanceRequestSchema))
    body: TransferBalanceRequest,
  ): Promise<void> {
    await this.commandBus.execute<TransferBalanceCommand, void>(
      new TransferBalanceCommand(
        request.user.id,
        body.recipientId,
        body.amountCents,
      ),
    );
  }

  @Patch('profile/my')
  @UseInterceptors(new ZodResponseInterceptor(UserProfileSchema))
  async updateMyProfile(
    @Req() request: AuthenticatedHttpRequest,
    @Body(new ZodValidationPipe(UpdateProfileRequestSchema))
    body: UpdateProfileRequest,
  ): Promise<UserProfile> {
    return this.commandBus.execute<UpdateMyProfileCommand, UserProfile>(
      new UpdateMyProfileCommand(request.user.id, body),
    );
  }

  @Post('profile/my/avatars')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      storage: diskStorage({
        destination: avatarUploadTempDirectory,
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}-${file.originalname}`);
        },
      }),
    }),
    new ZodResponseInterceptor(AvatarSchema),
  )
  async uploadAvatar(
    @Req() request: AuthenticatedHttpRequest,
    @UploadedFile(new AvatarFileValidationPipe()) file: UploadedAvatarFile,
  ): Promise<Avatar> {
    return this.commandBus.execute<UploadAvatarCommand, Avatar>(
      new UploadAvatarCommand(request.user.id, file),
    );
  }

  @Delete('profile/my/avatars/:avatarId')
  @HttpCode(204)
  async deleteAvatar(
    @Req() request: AuthenticatedHttpRequest,
    @Param(new ZodValidationPipe(AvatarParamsSchema)) params: AvatarParams,
  ): Promise<void> {
    await this.commandBus.execute<DeleteAvatarCommand, void>(
      new DeleteAvatarCommand(request.user.id, params.avatarId),
    );
  }

  @Delete('profile/my')
  @HttpCode(204)
  async deleteMyProfile(
    @Req() request: AuthenticatedHttpRequest,
  ): Promise<void> {
    await this.commandBus.execute<DeleteMyProfileCommand, void>(
      new DeleteMyProfileCommand(request.user.id),
    );
  }
}
