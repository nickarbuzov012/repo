import { BalanceResetResponseSchema } from '../contracts/balances.contracts';
import { UserRole } from '../../users/entities/user.entity';

const tags = ['Balances'];
const authenticatedPolicy = {
  isConfigured: true,
  isProtected: true,
  allowRoles: [UserRole.User, UserRole.Admin],
};

export const balancesZSlice = {
  'POST /balances/reset': {
    tags,
    summary: 'Enqueue asynchronous balance reset',
    auth: true,
    policy: authenticatedPolicy,
    res: { status: 202, schema: BalanceResetResponseSchema },
  },
};
