process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST ??= 'localhost';
process.env.DATABASE_PORT ??= process.env.TEST_DATABASE_PORT ?? '5433';
process.env.DATABASE_USER ??= process.env.TEST_DATABASE_USER ?? 'postgres';
process.env.DATABASE_PASSWORD ??= process.env.TEST_DATABASE_PASSWORD ?? 'postgres';
process.env.DATABASE_NAME ??= process.env.TEST_DATABASE_NAME ?? 'users_api_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ACCESS_TTL ??= '5m';
process.env.JWT_REFRESH_TTL ??= '7d';

jest.setTimeout(30000);
