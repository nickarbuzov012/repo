import {
  AuthResponseSchema,
  LoginRequestSchema,
  MeResponseSchema,
  RefreshTokenCookieSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,
} from '../contracts/auth.contracts';
import { UserRole } from '../../users/entities/user.entity';

const publicPolicy = {
  isConfigured: true,
  isProtected: false,
  allowRoles: [],
};

const authenticatedPolicy = {
  isConfigured: true,
  isProtected: true,
  allowRoles: [UserRole.User, UserRole.Admin],
};

export const validators = {
  register: {
    body: RegisterRequestSchema,
    res: AuthResponseSchema,
  },
  login: {
    body: LoginRequestSchema,
    res: AuthResponseSchema,
  },
  refreshToken: {
    body: RefreshTokenRequestSchema,
    cookies: RefreshTokenCookieSchema,
    res: AuthResponseSchema,
  },
  me: {
    res: MeResponseSchema,
  },
};

const tags = ['Auth'];

export const authZSlice = {
  'POST /auth/registration': {
    tags,
    summary: 'Register user',
    policy: publicPolicy,
    body: validators.register.body,
    res: { status: 201, schema: validators.register.res },
  },
  'POST /auth/login': {
    tags,
    summary: 'Login user',
    policy: publicPolicy,
    body: validators.login.body,
    res: { status: 201, schema: validators.login.res },
  },
  'POST /auth/refresh-token': {
    tags,
    summary: 'Refresh token pair',
    policy: publicPolicy,
    cookies: validators.refreshToken.cookies,
    unauthorized: true,
    res: { status: 201, schema: validators.refreshToken.res },
  },
  'GET /auth/me': {
    tags,
    summary: 'Get current user',
    auth: true,
    policy: authenticatedPolicy,
    res: { status: 200, schema: validators.me.res },
  },
};
