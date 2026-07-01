import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRequestUser } from '../features/auth/auth-request-user';
import { TokenService } from '../features/auth/services/token.service';
import { UserEntity } from '../features/users/entities/user.entity';
import { findZRouteEntry } from '../infrastructure/validation/route-registry.matcher';
import { PolicyService } from './policy.service';

interface PolicyHttpRequest {
  method: string;
  path?: string;
  url?: string;
  header(name: string): string | undefined;
  user?: AuthRequestUser;
}

@Injectable()
export class EndpointPolicyGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly policyService: PolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PolicyHttpRequest>();
    const route = findZRouteEntry(
      request.method,
      request.path ?? request.url ?? '/',
    );

    const policy = await this.policyService.getEffectivePolicy(
      route?.entry.method ?? request.method,
      route?.entry.routePattern ?? request.path ?? request.url ?? '/',
      route?.entry.conf.policy,
    );

    if (!policy?.isConfigured) {
      throw new ForbiddenException('Endpoint policy is not configured');
    }

    if (!policy.isProtected) {
      return true;
    }

    const user = await this.authenticate(request);

    if (
      policy.allowRoles.length > 0 &&
      !user.roles.some((role) => policy.allowRoles.includes(role))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.user = user;
    return true;
  }

  private async authenticate(
    request: PolicyHttpRequest,
  ): Promise<AuthRequestUser> {
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const payload = this.tokenService.verifyAccessToken(
      authorization.replace('Bearer ', ''),
    );
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      select: { id: true, roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      roles: user.roles,
    };
  }
}
