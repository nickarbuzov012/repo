import {
  AuthResponseSchema,
  LoginRequestSchema,
  MeResponseSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,
} from '../contracts/auth.contracts';

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
    body: validators.register.body,
    res: { status: 201, schema: validators.register.res },
  },
  'POST /auth/login': {
    tags,
    summary: 'Login user',
    body: validators.login.body,
    res: { status: 201, schema: validators.login.res },
  },
  'POST /auth/refresh-token': {
    tags,
    summary: 'Refresh token pair',
    body: validators.refreshToken.body,
    res: { status: 201, schema: validators.refreshToken.res },
  },
  'GET /auth/me': {
    tags,
    summary: 'Get current user',
    auth: true,
    res: { status: 200, schema: validators.me.res },
  },
};
