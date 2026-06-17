import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const isTest = configService.get<string>('NODE_ENV') === 'test';

  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('DATABASE_HOST'),
    port: Number(configService.getOrThrow<string>('DATABASE_PORT')),
    username: configService.getOrThrow<string>('DATABASE_USER'),
    password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
    database: configService.getOrThrow<string>('DATABASE_NAME'),
    autoLoadEntities: true,
    synchronize: false,
    dropSchema: isTest,
    migrationsRun: isTest,
    migrations: [
      isTest ? 'src/database/migrations/*.ts' : 'dist/database/migrations/*.js',
    ],
  };
}
