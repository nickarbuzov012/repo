import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

export interface E2eTestApp {
  app: INestApplication;
  baseUrl: string;
  dataSource: DataSource;
}

export async function createE2eTestApp(): Promise<E2eTestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');

  await app.init();
  await app.listen(0);

  return {
    app,
    baseUrl: await app.getUrl(),
    dataSource: app.get(DataSource),
  };
}

interface JsonRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

export interface JsonResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

export async function requestJson<T = unknown>(
  baseUrl: string,
  method: string,
  path: string,
  options: JsonRequestOptions = {},
): Promise<JsonResponse<T>> {
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: (text ? JSON.parse(text) : undefined) as T,
    headers: response.headers,
  };
}
