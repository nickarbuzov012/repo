import { UserEntity } from '../../src/features/users/entities/user.entity';
import { E2eTestApp, createE2eTestApp, requestJson } from './test-app';

interface AuthResponseBody {
  access_token: string;
  refresh_token: string;
}

interface MeResponseBody {
  id: string;
  login: string;
  email: string;
  age: number;
  description: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const registerPayload = {
  login: 'john',
  email: 'John@example.com',
  password: 'password123',
  age: 25,
  description: 'About John',
};

describe('application endpoints (e2e)', () => {
  let testApp: E2eTestApp;

  beforeAll(async () => {
    testApp = await createE2eTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
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
      refresh_token: expect.any(String),
    });

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
      role: 'user',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

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
      refresh_token: expect.any(String),
    });

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
        body: {
          refresh_token: login.body.refresh_token,
        },
      },
    );

    expect(refresh.status).toBe(201);
    expect(refresh.body).toEqual({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });

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
        body: {
          refresh_token: login.body.refresh_token,
        },
      },
    );

    expect(revokedRefresh.status).toBe(401);

    const secondRefresh = await requestJson<AuthResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/auth/refresh-token',
      {
        body: {
          refresh_token: refresh.body.refresh_token,
        },
      },
    );

    expect(secondRefresh.status).toBe(201);
    expect(secondRefresh.body).toEqual({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });
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
});
