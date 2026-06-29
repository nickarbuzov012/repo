import {
  EndpointPoliciesResponseSchema,
  EndpointPolicySchema,
  UpdateEndpointPolicyRequestSchema,
} from '../contracts/policy.contracts';
import { UserRole } from '../../features/users/entities/user.entity';

const tags = ['Policy'];
const adminPolicy = {
  isConfigured: true,
  isProtected: true,
  allowRoles: [UserRole.Admin],
};

export const policyZSlice = {
  'GET /policy': {
    tags,
    summary: 'List endpoint policies',
    auth: true,
    policy: adminPolicy,
    res: { status: 200, schema: EndpointPoliciesResponseSchema },
  },
  'PUT /policy': {
    tags,
    summary: 'Update endpoint policy',
    auth: true,
    policy: adminPolicy,
    body: UpdateEndpointPolicyRequestSchema,
    res: { status: 200, schema: EndpointPolicySchema },
  },
};
