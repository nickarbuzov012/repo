import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthCheckResponse } from '../health.contracts';

export class HealthCheckQuery {}

@QueryHandler(HealthCheckQuery)
export class HealthCheckHandler
  implements IQueryHandler<HealthCheckQuery, HealthCheckResponse>
{
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(): Promise<HealthCheckResponse> {
    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        database: 'ok',
      };
    } catch {
      return {
        status: 'error',
        database: 'error',
      };
    }
  }
}
