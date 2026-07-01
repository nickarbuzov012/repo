import { config } from 'dotenv';

config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST ??= 'localhost';
process.env.DATABASE_PORT ??= '5433';
process.env.DATABASE_USER ??= 'postgres';
process.env.DATABASE_PASSWORD ??= 'postgres';
process.env.DATABASE_NAME ??= 'users_api_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ACCESS_TTL ??= '5m';
process.env.JWT_REFRESH_TTL ??= '7d';
process.env.REDIS_HOST ??= 'localhost';
process.env.REDIS_PORT ??= '6379';
process.env.MINIO_ENDPOINT ??= 'http://localhost:9000';
process.env.MINIO_ACCESS_KEY ??= 'minio';
process.env.MINIO_SECRET_KEY ??= 'minio-secret';
process.env.MINIO_BUCKET ??= 'avatars-test';
process.env.MINIO_REGION ??= 'us-east-1';

jest.setTimeout(30000);
