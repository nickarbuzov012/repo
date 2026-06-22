import {
  ActiveUsersQuerySchema,
  ActiveUsersResponseSchema,
  AvatarParamsSchema,
  AvatarSchema,
  AvatarUploadBodySchema,
  UpdateProfileRequestSchema,
  UserProfileSchema,
  UsersListQuerySchema,
  UsersListResponseSchema,
} from '../contracts/users.contracts';

const tags = ['Users'];

export const validators = {
  list: {
    query: UsersListQuerySchema,
    res: UsersListResponseSchema,
  },
  updateProfile: {
    body: UpdateProfileRequestSchema,
    res: UserProfileSchema,
  },
};

export const usersZSlice = {
  'GET /users/active': {
    tags,
    summary: 'Get active users by age range',
    auth: true,
    query: ActiveUsersQuerySchema,
    res: { status: 200, schema: ActiveUsersResponseSchema },
  },
  'GET /users': {
    tags,
    summary: 'Get users list',
    auth: true,
    query: validators.list.query,
    res: { status: 200, schema: validators.list.res },
  },
  'PATCH /profile/my': {
    tags,
    summary: 'Update current user profile',
    auth: true,
    body: validators.updateProfile.body,
    res: { status: 200, schema: validators.updateProfile.res },
  },
  'DELETE /profile/my': {
    tags,
    summary: 'Soft delete current user profile',
    auth: true,
    res: { status: 204, schema: UserProfileSchema.optional() },
  },
  'POST /profile/my/avatars': {
    tags,
    summary: 'Upload an avatar for the current user',
    auth: true,
    multipartBody: AvatarUploadBodySchema,
    res: { status: 201, schema: AvatarSchema },
  },
  'DELETE /profile/my/avatars/:avatarId': {
    tags,
    summary: 'Soft delete an avatar of the current user',
    auth: true,
    params: AvatarParamsSchema,
    res: { status: 204, schema: AvatarSchema.optional() },
  },
};
