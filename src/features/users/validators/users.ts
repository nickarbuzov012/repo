import {
  ActiveUsersQuerySchema,
  ActiveUsersResponseSchema,
  AvatarParamsSchema,
  AvatarSchema,
  AvatarUploadBodySchema,
  TransferBalanceRequestSchema,
  UpdateProfileRequestSchema,
  UserProfileSchema,
  UsersListQuerySchema,
  UsersListResponseSchema,
} from '../contracts/users.contracts';
import { UserRole } from '../entities/user.entity';

const tags = ['Users'];
const authenticatedPolicy = {
  isConfigured: true,
  isProtected: true,
  allowRoles: [UserRole.User, UserRole.Admin],
};

export const validators = {
  list: {
    query: UsersListQuerySchema,
    res: UsersListResponseSchema,
  },
  updateProfile: {
    body: UpdateProfileRequestSchema,
    res: UserProfileSchema,
  },
  transferBalance: {
    body: TransferBalanceRequestSchema,
  },
};

export const usersZSlice = {
  'GET /users/active': {
    tags,
    summary: 'Get active users by age range',
    auth: true,
    policy: authenticatedPolicy,
    query: ActiveUsersQuerySchema,
    res: { status: 200, schema: ActiveUsersResponseSchema },
  },
  'GET /users': {
    tags,
    summary: 'Get users list',
    auth: true,
    policy: authenticatedPolicy,
    query: validators.list.query,
    res: { status: 200, schema: validators.list.res },
  },
  'POST /users/transfer': {
    tags,
    summary: 'Transfer balance to another user',
    auth: true,
    policy: authenticatedPolicy,
    body: validators.transferBalance.body,
    res: { status: 204, schema: UserProfileSchema.optional() },
  },
  'PATCH /profile/my': {
    tags,
    summary: 'Update current user profile',
    auth: true,
    policy: authenticatedPolicy,
    body: validators.updateProfile.body,
    res: { status: 200, schema: validators.updateProfile.res },
  },
  'DELETE /profile/my': {
    tags,
    summary: 'Soft delete current user profile',
    auth: true,
    policy: authenticatedPolicy,
    res: { status: 204, schema: UserProfileSchema.optional() },
  },
  'POST /profile/my/avatars': {
    tags,
    summary: 'Upload an avatar for the current user',
    auth: true,
    policy: authenticatedPolicy,
    multipartBody: AvatarUploadBodySchema,
    res: { status: 201, schema: AvatarSchema },
  },
  'DELETE /profile/my/avatars/:avatarId': {
    tags,
    summary: 'Soft delete an avatar of the current user',
    auth: true,
    policy: authenticatedPolicy,
    params: AvatarParamsSchema,
    res: { status: 204, schema: AvatarSchema.optional() },
  },
};
