import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponseInterceptor } from '../../common/serialization/zod-response.interceptor';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { AuthRequestUser } from '../auth/auth-request-user';
import {
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
  UserProfile,
  UserProfileSchema,
  UsersListQuery,
  UsersListQuerySchema,
  UsersListResponse,
  UsersListResponseSchema,
} from './contracts/users.contracts';
import { DeleteMyProfileCommand } from './commands/delete-my-profile.command-handler';
import { UpdateMyProfileCommand } from './commands/update-my-profile.command-handler';
import { ListUsersQuery } from './queries/list-users.query-handler';

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
