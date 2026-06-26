import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './health.controller';
import { HealthCheckHandler } from './queries/health-check.handler';

@Module({
  imports: [CqrsModule],
  controllers: [HealthController],
  providers: [HealthCheckHandler],
})
export class HealthModule {}
