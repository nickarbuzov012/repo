import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ZodResponseInterceptor } from '../common/serialization/zod-response.interceptor';
import {
  HealthCheckResponse,
  HealthCheckResponseSchema,
} from './health.contracts';
import {
  HealthCheckQuery,
} from './queries/health-check.handler';

@Controller('health')
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @UseInterceptors(new ZodResponseInterceptor(HealthCheckResponseSchema))
  async check(): Promise<HealthCheckResponse> {
    return this.queryBus.execute<HealthCheckQuery, HealthCheckResponse>(
      new HealthCheckQuery(),
    );
  }
}
