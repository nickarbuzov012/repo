import { BalanceResetResponseSchema } from '../contracts/balances.contracts';

const tags = ['Balances'];

export const balancesZSlice = {
  'POST /balances/reset': {
    tags,
    summary: 'Enqueue asynchronous balance reset',
    auth: true,
    res: { status: 202, schema: BalanceResetResponseSchema },
  },
};
