import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRequestUser } from './auth-request-user';
import { TokenService } from './services/token.service';
import { UserEntity } from '../users/entities/user.entity';

interface AuthenticatedHttpRequest {
  header(name: string): string | undefined;
  user: AuthRequestUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      select: { id: true, roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = {
      id: user.id,
      roles: user.roles,
    };

    return true;
  }
}
