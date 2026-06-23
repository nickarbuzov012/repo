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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BalancesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ZodRouteValidationMiddleware).forRoutes('*');
  }
}
