import { createHmac } from 'crypto';
import { UserEntity } from '../../src/features/users/entities/user.entity';
import { E2eTestApp, createE2eTestApp, requestJson } from './test-app';

interface AuthResponseBody {
  access_token: string;
}

interface MeResponseBody {
  id: string;
  login: string;
  email: string;
  age: number;
  description: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface UsersListResponseBody {
  items: MeResponseBody[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const registerPayload = {
  login: 'john',
  email: 'John@example.com',
  password: 'password123',
  age: 25,
  description: 'About John',
};

async function registerUser(
  baseUrl: string,
  payload: typeof registerPayload,
): Promise<AuthResponseBody> {
  const response = await requestJson<AuthResponseBody>(
    baseUrl,
    'POST',
    '/api/auth/registration',
    { body: payload },
  );

  expect(response.status).toBe(201);
  return response.body;
}

function expectRefreshCookie(response: { headers: Headers }): string {
  const setCookie = response.headers.get('set-cookie');

  expect(setCookie).toEqual(expect.stringContaining('refresh_token='));
  expect(setCookie).toEqual(expect.stringContaining('HttpOnly'));
  expect(setCookie).toEqual(expect.stringContaining('SameSite=Strict'));

  return setCookie!.split(';')[0];
}

function createExpiredAccessToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      roles: ['user'],
      type: 'access',
      iat: now - 60,
      exp: now - 1,
    }),
  ).toString('base64url');
  const signature = createHmac(
    'sha256',
    process.env.JWT_ACCESS_SECRET!,
  )
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

describe('application endpoints (e2e)', () => {
  let testApp: E2eTestApp;

  beforeAll(async () => {
    testApp = await createE2eTestApp();
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  it('starts with an empty migrated test database', async () => {
    await expect(
      testApp.dataSource.getRepository(UserEntity).count(),
    ).resolves.toBe(0);
  });

  it('GET /api/health returns service and database status', async () => {
    const response = await requestJson(testApp.baseUrl, 'GET', '/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('runs the full auth flow through HTTP endpoints', async () => {
    const registration = await requestJson<AuthResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/auth/registration',
      { body: registerPayload },
    );

    expect(registration.status).toBe(201);
    expect(registration.body).toEqual({
      access_token: expect.any(String),
    });
    expect(registration.body).not.toHaveProperty('refresh_token');
    expectRefreshCookie(registration);

    const me = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: {
          authorization: `Bearer ${registration.body.access_token}`,
        },
      },
    );

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      id: expect.any(String),
      login: registerPayload.login,
      email: 'john@example.com',
      age: registerPayload.age,
      description: registerPayload.description,
      roles: ['user'],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const expiredAccess = await requestJson(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: {
          authorization: `Bearer ${createExpiredAccessToken(me.body.id)}`,
        },
      },
    );

    expect(expiredAccess.status).toBe(401);

    const unauthenticatedMe = await requestJson(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
    );

    expect(unauthenticatedMe.status).toBe(401);

    const login = await requestJson<AuthResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/auth/login',
      {
        body: {
          login: registerPayload.login,
          password: registerPayload.password,
        },
      },
    );

    expect(login.status).toBe(201);
    expect(login.body).toEqual({
      access_token: expect.any(String),
    });
    expect(login.body).not.toHaveProperty('refresh_token');
    const loginRefreshCookie = expectRefreshCookie(login);

    const meWithLoginToken = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: {
          authorization: `Bearer ${login.body.access_token}`,
        },
      },
    );

    expect(meWithLoginToken.status).toBe(200);
    expect(meWithLoginToken.body.id).toBe(me.body.id);

    const refresh = await requestJson<AuthResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/auth/refresh-token',
      {
        headers: {
          cookie: loginRefreshCookie,
        },
      },
    );

    expect(refresh.status).toBe(201);
    expect(refresh.body).toEqual({
      access_token: expect.any(String),
    });
    expect(refresh.body).not.toHaveProperty('refresh_token');
    const refreshCookie = expectRefreshCookie(refresh);

    const meWithRefreshedToken = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: {
          authorization: `Bearer ${refresh.body.access_token}`,
        },
      },
    );

    expect(meWithRefreshedToken.status).toBe(200);
    expect(meWithRefreshedToken.body.id).toBe(me.body.id);

    const revokedRefresh = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/auth/refresh-token',
      {
        headers: {
          cookie: loginRefreshCookie,
        },
      },
    );

    expect(revokedRefresh.status).toBe(401);

    const secondRefresh = await requestJson<AuthResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/auth/refresh-token',
      {
        headers: {
          cookie: refreshCookie,
        },
      },
    );

    expect(secondRefresh.status).toBe(201);
    expect(secondRefresh.body).toEqual({
      access_token: expect.any(String),
    });
    expect(secondRefresh.body).not.toHaveProperty('refresh_token');
    expectRefreshCookie(secondRefresh);
  });

  it('rejects invalid registration payloads', async () => {
    const response = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/auth/registration',
      {
        body: {
          ...registerPayload,
          email: 'invalid-email',
        },
      },
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: {
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
          }),
        ]),
      },
    });
  });

  it('rejects duplicate registration', async () => {
    const response = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/auth/registration',
      { body: registerPayload },
    );

    expect(response.status).toBe(409);
  });

  it('lists users with pagination and login search for authorized users', async () => {
    await registerUser(testApp.baseUrl, {
      login: 'alice',
      email: 'alice@example.com',
      password: 'password123',
      age: 28,
      description: 'About Alice',
    });
    const bob = await registerUser(testApp.baseUrl, {
      login: 'bob',
      email: 'bob@example.com',
      password: 'password123',
      age: 31,
      description: 'About Bob',
    });

    const unauthorized = await requestJson(
      testApp.baseUrl,
      'GET',
      '/api/users',
    );

    expect(unauthorized.status).toBe(401);

    const firstPage = await requestJson<UsersListResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/users?page=1&limit=2',
      {
        headers: {
          authorization: `Bearer ${bob.access_token}`,
        },
      },
    );

    expect(firstPage.status).toBe(200);
    expect(firstPage.body).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      pages: 2,
    });
    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.items[0]).not.toHaveProperty('passwordHash');

    const search = await requestJson<UsersListResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/users?page=1&limit=10&search=ali',
      {
        headers: {
          authorization: `Bearer ${bob.access_token}`,
        },
      },
    );

    expect(search.status).toBe(200);
    expect(search.body).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      pages: 1,
    });
    expect(search.body.items[0].login).toBe('alice');
  });

  it('gets auth me, updates and soft deletes current profile', async () => {
    const auth = await registerUser(testApp.baseUrl, {
      login: 'profile-user',
      email: 'profile-user@example.com',
      password: 'password123',
      age: 20,
      description: 'Original profile',
    });

    const profile = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: {
          authorization: `Bearer ${auth.access_token}`,
        },
      },
    );

    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      login: 'profile-user',
      email: 'profile-user@example.com',
      age: 20,
      description: 'Original profile',
    });

    const updated = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'PATCH',
      '/api/profile/my',
      {
        headers: {
          authorization: `Bearer ${auth.access_token}`,
        },
        body: {
          login: 'profile-updated',
          email: 'profile-updated@example.com',
          password: 'new-password123',
          age: 21,
          description: 'Updated profile',
        },
      },
    );

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: profile.body.id,
      login: 'profile-updated',
      email: 'profile-updated@example.com',
      age: 21,
      description: 'Updated profile',
    });

    const oldPasswordLogin = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/auth/login',
      {
        body: {
          login: 'profile-updated',
          password: 'password123',
        },
      },
    );

    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await requestJson<AuthResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/auth/login',
      {
        body: {
          login: 'profile-updated',
          password: 'new-password123',
        },
      },
    );

    expect(newPasswordLogin.status).toBe(201);
    const deletedUserRefreshCookie = expectRefreshCookie(newPasswordLogin);

    const deleted = await requestJson(
      testApp.baseUrl,
      'DELETE',
      '/api/profile/my',
      {
        headers: {
          authorization: `Bearer ${newPasswordLogin.body.access_token}`,
        },
      },
    );

    expect(deleted.status).toBe(204);

    const accessAfterDelete = await requestJson(
      testApp.baseUrl,
      'GET',
      '/api/users',
      {
        headers: {
          authorization: `Bearer ${newPasswordLogin.body.access_token}`,
        },
      },
    );

    expect(accessAfterDelete.status).toBe(401);

    const refreshAfterDelete = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/auth/refresh-token',
      {
        headers: {
          cookie: deletedUserRefreshCookie,
        },
      },
    );

    expect(refreshAfterDelete.status).toBe(401);

    await expect(
      testApp.dataSource.getRepository(UserEntity).findOne({
        where: { id: profile.body.id },
        withDeleted: true,
      }),
    ).resolves.toMatchObject({
      id: profile.body.id,
      deletedAt: expect.any(Date),
    });

    const loginDeleted = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/auth/login',
      {
        body: {
          login: 'profile-updated',
          password: 'new-password123',
        },
      },
    );

    expect(loginDeleted.status).toBe(401);
  });
});
