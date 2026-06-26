import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../features/auth/auth.module';
import { UserEntity } from '../features/users/entities/user.entity';
import { AdminInitializer } from './admin-initializer.service';
import { EndpointPolicyGuard } from './endpoint-policy.guard';
import { PolicyController } from './policy.controller';
import { EndpointPolicyEntity } from './entities/endpoint-policy.entity';
import { PolicyService } from './policy.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EndpointPolicyEntity, UserEntity]),
    AuthModule,
  ],
  controllers: [PolicyController],
  providers: [
    PolicyService,
    AdminInitializer,
    {
      provide: APP_GUARD,
      useClass: EndpointPolicyGuard,
    },
  ],
  exports: [PolicyService],
})
export class PolicyModule {}
