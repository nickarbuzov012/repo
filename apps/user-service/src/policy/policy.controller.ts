import { Body, Controller, Get, Put, UseInterceptors } from '@nestjs/common';
import { ZodResponseInterceptor } from '../common/serialization/zod-response.interceptor';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  EndpointPoliciesResponse,
  EndpointPoliciesResponseSchema,
  EndpointPolicy,
  EndpointPolicySchema,
  UpdateEndpointPolicyRequest,
  UpdateEndpointPolicyRequestSchema,
} from './contracts/policy.contracts';
import { PolicyService } from './policy.service';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  @UseInterceptors(new ZodResponseInterceptor(EndpointPoliciesResponseSchema))
  listPolicies(): Promise<EndpointPoliciesResponse> {
    return this.policyService.listPolicies();
  }

  @Put()
  @UseInterceptors(new ZodResponseInterceptor(EndpointPolicySchema))
  updatePolicy(
    @Body(new ZodValidationPipe(UpdateEndpointPolicyRequestSchema))
    body: UpdateEndpointPolicyRequest,
  ): Promise<EndpointPolicy> {
    return this.policyService.upsertPolicy(body);
  }
}
