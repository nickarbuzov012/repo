import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ZodType } from 'zod';

@Injectable()
export class ZodResponseInterceptor<T> implements NestInterceptor<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<T> {
    return next.handle().pipe(map((value) => this.schema.parse(value)));
  }
}
