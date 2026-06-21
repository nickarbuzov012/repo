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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodResponseInterceptor } from '../../common/serialization/zod-response.interceptor';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { AuthRequestUser } from '../auth/auth-request-user';
import {
  Avatar,
  AvatarParams,
  AvatarParamsSchema,
  AvatarSchema,
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
import { UpdateMyProfileCommand } from './commands/update-my-profile.command-handler';
import { UploadAvatarCommand } from './commands/upload-avatar.command-handler';
import { ListUsersQuery } from './queries/list-users.query-handler';
import {
  AvatarFileValidationPipe,
  MAX_AVATAR_SIZE_BYTES,
  UploadedAvatarFile,
} from './pipes/avatar-file-validation.pipe';

interface AuthenticatedHttpRequest {
  user: AuthRequestUser;
}

@Controller()
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('users')
  @UseInterceptors(new ZodResponseInterceptor(UsersListResponseSchema))
  async listUsers(
    @Query(new ZodValidationPipe(UsersListQuerySchema)) query: UsersListQuery,
  ): Promise<UsersListResponse> {
    return this.queryBus.execute<ListUsersQuery, UsersListResponse>(
      new ListUsersQuery(query),
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
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_SIZE_BYTES } }),
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
