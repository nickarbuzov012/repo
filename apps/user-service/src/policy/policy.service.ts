import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../features/users/entities/user.entity';
import { zRegistry } from '../infrastructure/validation/z-registry';
import {
  EndpointPolicy,
  EndpointPoliciesResponse,
  UpdateEndpointPolicyRequest,
} from './contracts/policy.contracts';
import { EndpointPolicyEntity } from './entities/endpoint-policy.entity';

export type EndpointPolicyConfig = {
  isConfigured: boolean;
  isProtected: boolean;
  allowRoles: UserRole[];
};

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(EndpointPolicyEntity)
    private readonly endpointPoliciesRepository: Repository<EndpointPolicyEntity>,
  ) {}

  async getEffectivePolicy(
    method: string,
    path: string,
    fallback: EndpointPolicyConfig | undefined,
  ): Promise<EndpointPolicyConfig | undefined> {
    const override = await this.endpointPoliciesRepository.findOne({
      where: { method: method.toUpperCase(), path },
    });

    if (!override) {
      return fallback;
    }

    return {
      isConfigured: override.isConfigured,
      isProtected: override.isProtected,
      allowRoles: override.allowRoles,
    };
  }

  async listPolicies(): Promise<EndpointPoliciesResponse> {
    const overrides = await this.endpointPoliciesRepository.find();
    const overridesByRoute = new Map(
      overrides.map((policy) => [`${policy.method} ${policy.path}`, policy]),
    );

    return Object.entries(zRegistry)
      .filter(([, entry]) => entry.policy)
      .map(([route, entry]) => {
        const [method, path] = route.split(' ', 2);
        const override = overridesByRoute.get(route);
        const fallback = entry.policy!;

        return override
          ? this.toResponse(override)
          : {
              method: method as EndpointPolicy['method'],
              path,
              isConfigured: fallback.isConfigured,
              isProtected: fallback.isProtected,
              allowRoles: fallback.allowRoles,
            };
      })
      .sort((left, right) =>
        `${left.method} ${left.path}`.localeCompare(
          `${right.method} ${right.path}`,
        ),
      );
  }

  async upsertPolicy(
    payload: UpdateEndpointPolicyRequest,
  ): Promise<EndpointPolicy> {
    const method = payload.method.toUpperCase();

    if (!zRegistry[`${method} ${payload.path}`]) {
      throw new NotFoundException('Endpoint is not registered');
    }

    const policy =
      (await this.endpointPoliciesRepository.findOne({
        where: { method, path: payload.path },
      })) ??
      this.endpointPoliciesRepository.create({
        method,
        path: payload.path,
      });

    policy.isConfigured = payload.isConfigured;
    policy.isProtected = payload.isProtected;
    policy.allowRoles = payload.allowRoles;

    return this.toResponse(await this.endpointPoliciesRepository.save(policy));
  }

  private toResponse(policy: EndpointPolicyEntity): EndpointPolicy {
    return {
      method: policy.method as EndpointPolicy['method'],
      path: policy.path,
      isConfigured: policy.isConfigured,
      isProtected: policy.isProtected,
      allowRoles: policy.allowRoles,
    };
  }
}
