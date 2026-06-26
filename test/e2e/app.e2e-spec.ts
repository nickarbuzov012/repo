import { createHmac } from 'crypto';
import { UserEntity } from '../../apps/user-service/src/features/users/entities/user.entity';
import { AvatarEntity } from '../../apps/user-service/src/features/users/entities/avatar.entity';
import {
  MinorUnitSchema,
  POSTGRES_INTEGER_MAX,
} from '../../apps/user-service/src/common/validation/minor-unit.schema';
import { CacheService } from '../../apps/user-service/src/providers/cache/cache.service';
import { type E2eTestApp, createE2eTestApp, requestJson } from './test-app';

interface AuthResponseBody {
  access_token: string;
}

interface UserProfileResponseBody {
  id: string;
  login: string;
  email: string;
  age: number;
  description: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface MeResponseBody extends UserProfileResponseBody {
  balance: number;
}

interface UsersListResponseBody {
  items: UserProfileResponseBody[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AvatarResponseBody {
  id: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png';
  size: number;
  createdAt: string;
}

interface ActiveUsersResponseBody {
  items: Array<{
    id: string;
    login: string;
    age: number;
    description: string;
    latestAvatar: AvatarResponseBody;
  }>;
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface BalanceResetResponseBody {
  jobId: string;
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

async function uploadAvatar(
  baseUrl: string,
  accessToken: string,
  mimeType = 'image/png',
): Promise<{ status: number; body: AvatarResponseBody }> {
  const form = new FormData();
  form.append(
    'file',
    new Blob([Buffer.from('avatar-content')], { type: mimeType }),
    mimeType === 'image/png' ? 'avatar.png' : 'avatar.txt',
  );

  const response = await fetch(`${baseUrl}/api/profile/my/avatars`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: (text ? JSON.parse(text) : undefined) as AvatarResponseBody,
  };
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
  const signature = createHmac('sha256', process.env.JWT_ACCESS_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

async function waitForUserBalance(
  testApp: E2eTestApp,
  userId: string,
  expectedBalance: number,
): Promise<void> {
  const usersRepository = testApp.dataSource.getRepository(UserEntity);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const user = await usersRepository.findOneByOrFail({ id: userId });

    if (user.balance === expectedBalance) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const user = await usersRepository.findOneByOrFail({ id: userId });
  expect(user.balance).toBe(expectedBalance);
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
      balance: 0,
      roles: ['user'],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    await testApp.dataSource
      .getRepository(UserEntity)
      .update({ id: me.body.id }, { balance: 2051 });
    await testApp.app.get(CacheService).invalidateUser(me.body.id);

    const meWithBalance = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: {
          authorization: `Bearer ${registration.body.access_token}`,
        },
      },
    );

    expect(meWithBalance.status).toBe(200);
    expect(meWithBalance.body.balance).toBe(2051);

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

  it('validates monetary values as PostgreSQL integer minor units', () => {
    expect(MinorUnitSchema.safeParse(2051).success).toBe(true);
    expect(MinorUnitSchema.safeParse(1.5).success).toBe(false);
    expect(MinorUnitSchema.safeParse(-1).success).toBe(false);
    expect(MinorUnitSchema.safeParse(POSTGRES_INTEGER_MAX + 1).success).toBe(
      false,
    );
  });

  it('transfers balance transactionally between active users', async () => {
    const usersRepository = testApp.dataSource.getRepository(UserEntity);
    const cacheService = testApp.app.get(CacheService);
    const sender = await registerUser(testApp.baseUrl, {
      login: 'transfer-sender',
      email: 'transfer-sender@example.com',
      password: 'password123',
      age: 30,
      description: 'Transfer sender',
    });
    const recipient = await registerUser(testApp.baseUrl, {
      login: 'transfer-recipient',
      email: 'transfer-recipient@example.com',
      password: 'password123',
      age: 31,
      description: 'Transfer recipient',
    });
    const secondRecipient = await registerUser(testApp.baseUrl, {
      login: 'transfer-recipient-2',
      email: 'transfer-recipient-2@example.com',
      password: 'password123',
      age: 32,
      description: 'Transfer recipient 2',
    });

    const senderMe = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
      },
    );
    const recipientMe = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${recipient.access_token}` },
      },
    );
    const secondRecipientMe = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${secondRecipient.access_token}` },
      },
    );

    await usersRepository.update({ id: senderMe.body.id }, { balance: 1000 });
    await usersRepository.update({ id: recipientMe.body.id }, { balance: 100 });
    await Promise.all([
      cacheService.invalidateUser(senderMe.body.id),
      cacheService.invalidateUser(recipientMe.body.id),
    ]);

    const transfer = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/users/transfer',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: recipientMe.body.id,
          amountCents: 250,
        },
      },
    );

    expect(transfer.status).toBe(204);

    const senderAfterTransfer = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
      },
    );
    const recipientAfterTransfer = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${recipient.access_token}` },
      },
    );

    expect(senderAfterTransfer.body.balance).toBe(750);
    expect(recipientAfterTransfer.body.balance).toBe(350);

    const insufficientFunds = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/users/transfer',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: recipientMe.body.id,
          amountCents: 1000,
        },
      },
    );

    expect(insufficientFunds.status).toBe(409);
    await expect(
      usersRepository.findOneByOrFail({ id: senderMe.body.id }),
    ).resolves.toMatchObject({ balance: 750 });
    await expect(
      usersRepository.findOneByOrFail({ id: recipientMe.body.id }),
    ).resolves.toMatchObject({ balance: 350 });

    const selfTransfer = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/users/transfer',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: senderMe.body.id,
          amountCents: 1,
        },
      },
    );

    expect(selfTransfer.status).toBe(400);

    const missingRecipient = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/users/transfer',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: '1305f2ff-93c7-45aa-bc66-4f74b4ee2596',
          amountCents: 1,
        },
      },
    );

    expect(missingRecipient.status).toBe(404);

    const invalidAmount = await requestJson(
      testApp.baseUrl,
      'POST',
      '/api/users/transfer',
      {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: recipientMe.body.id,
          amountCents: 0,
        },
      },
    );

    expect(invalidAmount.status).toBe(400);

    const concurrentTransfers = await Promise.all([
      requestJson(testApp.baseUrl, 'POST', '/api/users/transfer', {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: recipientMe.body.id,
          amountCents: 600,
        },
      }),
      requestJson(testApp.baseUrl, 'POST', '/api/users/transfer', {
        headers: { authorization: `Bearer ${sender.access_token}` },
        body: {
          recipientId: secondRecipientMe.body.id,
          amountCents: 600,
        },
      }),
    ]);

    expect(concurrentTransfers.map(({ status }) => status).sort()).toEqual([
      204, 409,
    ]);
    await expect(
      usersRepository.findOneByOrFail({ id: senderMe.body.id }),
    ).resolves.toMatchObject({ balance: 150 });
  });

  it('enqueues and processes asynchronous balance reset', async () => {
    const usersRepository = testApp.dataSource.getRepository(UserEntity);
    const auth = await registerUser(testApp.baseUrl, {
      login: 'balance-reset-user',
      email: 'balance-reset-user@example.com',
      password: 'password123',
      age: 33,
      description: 'Balance reset user',
    });
    const me = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${auth.access_token}` },
      },
    );

    await usersRepository.update({ id: me.body.id }, { balance: 777 });
    await testApp.app.get(CacheService).invalidateUser(me.body.id);

    const meBeforeReset = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${auth.access_token}` },
      },
    );

    expect(meBeforeReset.body.balance).toBe(777);

    const reset = await requestJson<BalanceResetResponseBody>(
      testApp.baseUrl,
      'POST',
      '/api/balances/reset',
      {
        headers: { authorization: `Bearer ${auth.access_token}` },
      },
    );

    expect(reset.status).toBe(202);
    expect(reset.body).toEqual({ jobId: expect.any(String) });

    await waitForUserBalance(testApp, me.body.id, 0);

    const meAfterReset = await requestJson<MeResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/auth/me',
      {
        headers: { authorization: `Bearer ${auth.access_token}` },
      },
    );

    expect(meAfterReset.body.balance).toBe(0);
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

    const updated = await requestJson<UserProfileResponseBody>(
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

  it('uploads at most five active avatars and soft deletes only owned avatars', async () => {
    const owner = await registerUser(testApp.baseUrl, {
      login: 'avatar-owner',
      email: 'avatar-owner@example.com',
      password: 'password123',
      age: 24,
      description: 'Avatar owner',
    });
    const stranger = await registerUser(testApp.baseUrl, {
      login: 'avatar-stranger',
      email: 'avatar-stranger@example.com',
      password: 'password123',
      age: 27,
      description: 'Avatar stranger',
    });

    const avatars: AvatarResponseBody[] = [];

    for (let index = 0; index < 5; index += 1) {
      const upload = await uploadAvatar(testApp.baseUrl, owner.access_token);

      expect(upload.status).toBe(201);
      expect(upload.body).toMatchObject({
        id: expect.any(String),
        fileName: expect.stringMatching(/\.png$/),
        mimeType: 'image/png',
        size: expect.any(Number),
        createdAt: expect.any(String),
      });
      avatars.push(upload.body);
    }

    const sixthUpload = await uploadAvatar(testApp.baseUrl, owner.access_token);
    expect(sixthUpload.status).toBe(409);

    const unsupportedFile = await uploadAvatar(
      testApp.baseUrl,
      owner.access_token,
      'text/plain',
    );
    expect(unsupportedFile.status).toBe(400);

    const foreignDelete = await requestJson(
      testApp.baseUrl,
      'DELETE',
      `/api/profile/my/avatars/${avatars[0].id}`,
      {
        headers: {
          authorization: `Bearer ${stranger.access_token}`,
        },
      },
    );
    expect(foreignDelete.status).toBe(404);

    const ownerDelete = await requestJson(
      testApp.baseUrl,
      'DELETE',
      `/api/profile/my/avatars/${avatars[0].id}`,
      {
        headers: {
          authorization: `Bearer ${owner.access_token}`,
        },
      },
    );
    expect(ownerDelete.status).toBe(204);

    const replacement = await uploadAvatar(testApp.baseUrl, owner.access_token);
    expect(replacement.status).toBe(201);

    const repeatedDelete = await requestJson(
      testApp.baseUrl,
      'DELETE',
      `/api/profile/my/avatars/${avatars[0].id}`,
      {
        headers: {
          authorization: `Bearer ${owner.access_token}`,
        },
      },
    );
    expect(repeatedDelete.status).toBe(404);
  });

  it('lists active users with all filters, latest avatar and stable pagination', async () => {
    const usersRepository = testApp.dataSource.getRepository(UserEntity);
    const avatarsRepository = testApp.dataSource.getRepository(AvatarEntity);
    const passwordHash = 'not-used-by-this-test';

    const users = await usersRepository.save([
      usersRepository.create({
        login: 'active-in-range-a',
        email: 'active-a@example.com',
        passwordHash,
        age: 30,
        description: 'Active A',
      }),
      usersRepository.create({
        login: 'active-in-range-b',
        email: 'active-b@example.com',
        passwordHash,
        age: 40,
        description: 'Active B',
      }),
      usersRepository.create({
        login: 'active-outside-age',
        email: 'active-outside@example.com',
        passwordHash,
        age: 17,
        description: 'Too young',
      }),
      usersRepository.create({
        login: 'active-empty-description',
        email: 'active-empty@example.com',
        passwordHash,
        age: 35,
        description: '',
      }),
    ]);
    const [activeA, activeB, outsideAge, emptyDescription] = users;
    const baseDate = new Date('2026-01-01T00:00:00.000Z');

    for (const user of users) {
      await avatarsRepository.save(
        [0, 1, 2].map((index) =>
          avatarsRepository.create({
            userId: user.id,
            fileName: `active-query/${user.id}/${index}.png`,
            mimeType: 'image/png',
            size: 100 + index,
            createdAt: new Date(baseDate.getTime() + index * 1000),
          }),
        ),
      );
    }
    await avatarsRepository.save(
      avatarsRepository.create({
        userId: activeA.id,
        fileName: `active-query/${activeA.id}/deleted.png`,
        mimeType: 'image/png',
        size: 999,
        createdAt: new Date(baseDate.getTime() + 10_000),
        deletedAt: new Date(baseDate.getTime() + 11_000),
      }),
    );

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
    const accessToken = login.body.access_token;
    const firstPage = await requestJson<ActiveUsersResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/users/active?minAge=29&maxAge=45&page=1&limit=1',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );

    expect(firstPage.status).toBe(200);
    expect(firstPage.body).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      pages: 2,
    });
    expect(firstPage.body.items).toHaveLength(1);

    const secondPage = await requestJson<ActiveUsersResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/users/active?minAge=29&maxAge=45&page=2&limit=1',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const repeatedFirstPage = await requestJson<ActiveUsersResponseBody>(
      testApp.baseUrl,
      'GET',
      '/api/users/active?minAge=29&maxAge=45&page=1&limit=1',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(repeatedFirstPage.body.items[0].id).toBe(firstPage.body.items[0].id);
    expect(
      new Set(
        [...firstPage.body.items, ...secondPage.body.items].map(({ id }) => id),
      ),
    ).toEqual(new Set([activeA.id, activeB.id]));
    const activeAResult = [
      ...firstPage.body.items,
      ...secondPage.body.items,
    ].find(({ id }) => id === activeA.id);
    expect(activeAResult?.latestAvatar.fileName).toBe(
      `active-query/${activeA.id}/2.png`,
    );
    expect([outsideAge.id, emptyDescription.id]).not.toContain(
      firstPage.body.items[0].id,
    );

    const invalidRange = await requestJson(
      testApp.baseUrl,
      'GET',
      '/api/users/active?minAge=45&maxAge=29',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    expect(invalidRange.status).toBe(400);
  });
});
