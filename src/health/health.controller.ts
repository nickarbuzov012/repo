import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckQuery,
  HealthCheckResponse,
} from './queries/health-check.handler';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        database: 'ok',
      },
    },
  })
  async check(): Promise<HealthCheckResponse> {
    return this.queryBus.execute<HealthCheckQuery, HealthCheckResponse>(
      new HealthCheckQuery(),
    );
  }
}
