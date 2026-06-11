import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('DATABASE_HOST'),
    port: Number(configService.getOrThrow<string>('DATABASE_PORT')),
    username: configService.getOrThrow<string>('DATABASE_USER'),
    password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
    database: configService.getOrThrow<string>('DATABASE_NAME'),
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    migrations: ['dist/database/migrations/*.js'],
  };
}
