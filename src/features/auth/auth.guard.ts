import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRequestUser } from './auth-request-user';
import { TokenService } from './services/token.service';

interface AuthenticatedHttpRequest {
  header(name: string): string | undefined;
  user: AuthRequestUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedHttpRequest>();
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const payload = this.tokenService.verifyAccessToken(
      authorization.replace('Bearer ', ''),
    );

    request.user = {
      id: payload.sub,
      role: payload.role,
    };

    return true;
  }
}
