import {
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ZodResponseInterceptor } from '../../common/serialization/zod-response.interceptor';
import { AuthGuard } from '../auth/auth.guard';
import { ResetBalancesCommand } from './commands/reset-balances.command-handler';
import {
  BalanceResetResponse,
  BalanceResetResponseSchema,
} from './contracts/balances.contracts';

@Controller('balances')
@UseGuards(AuthGuard)
export class BalancesController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('reset')
  @HttpCode(202)
  @UseInterceptors(new ZodResponseInterceptor(BalanceResetResponseSchema))
  async resetBalances(): Promise<BalanceResetResponse> {
    return this.commandBus.execute<ResetBalancesCommand, BalanceResetResponse>(
      new ResetBalancesCommand(),
    );
  }
}
