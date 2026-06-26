import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './features/auth/auth.module';
import { BalancesModule } from './features/balances/balances.module';
import { UsersModule } from './features/users/users.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ZodRouteValidationMiddleware } from './infrastructure/validation/zod-route.middleware';
import { CacheModule } from './providers/cache/cache.module';
import { PolicyModule } from './policy/policy.module';

const getEnvFilePath = (): string[] => {
  if (process.env.NODE_ENV === 'test') {
    return ['.env.test', '.env'];
  }

  return ['.env'];
};

const getRedisPort = (configService: ConfigService): number => {
  const port = Number(configService.getOrThrow<string>('REDIS_PORT'));

  if (!Number.isInteger(port)) {
    throw new Error('REDIS_PORT must be an integer');
  }

  return port;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: getRedisPort(configService),
        },
      }),
    }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    PolicyModule,
    UsersModule,
    BalancesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ZodRouteValidationMiddleware).forRoutes('*');
  }
}
