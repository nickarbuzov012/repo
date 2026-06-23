import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { BALANCE_RESET_QUEUE } from './balance-reset.constants';
import { BalancesController } from './balances.controller';
import { ResetBalancesHandler } from './commands/reset-balances.command-handler';
import { BalanceResetProcessor } from './processors/balance-reset.processor';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    BullModule.registerQueue({
      name: BALANCE_RESET_QUEUE,
    }),
  ],
  controllers: [BalancesController],
  providers: [ResetBalancesHandler, BalanceResetProcessor],
})
export class BalancesModule {}
