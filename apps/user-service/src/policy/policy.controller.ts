import { Body, Controller, Put, UseInterceptors } from '@nestjs/common';
import { ZodResponseInterceptor } from '../common/serialization/zod-response.interceptor';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  EndpointPolicy,
  EndpointPolicySchema,
  UpdateEndpointPolicyRequest,
  UpdateEndpointPolicyRequestSchema,
} from './contracts/policy.contracts';
import { PolicyService } from './policy.service';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Put()
  @UseInterceptors(new ZodResponseInterceptor(EndpointPolicySchema))
  updatePolicy(
    @Body(new ZodValidationPipe(UpdateEndpointPolicyRequestSchema))
    body: UpdateEndpointPolicyRequest,
  ): Promise<EndpointPolicy> {
    return this.policyService.upsertPolicy(body);
  }
}
