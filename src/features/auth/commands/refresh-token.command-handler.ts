import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthResponse,
  RefreshTokenRequest,
} from '../contracts/auth.contracts';
import { RevokedRefreshTokenEntity } from '../entities/revoked-refresh-token.entity';
import { TokenService } from '../services/token.service';
import { UserEntity } from '../../users/entities/user.entity';

export class RefreshTokenCommand {
  constructor(public readonly payload: RefreshTokenRequest) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, AuthResponse>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RevokedRefreshTokenEntity)
    private readonly revokedTokensRepository: Repository<RevokedRefreshTokenEntity>,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthResponse> {
    const refreshToken = command.payload.refresh_token;

    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    const revokedToken = await this.revokedTokensRepository.findOne({
      where: { tokenId: payload.jti },
    });

    if (revokedToken) {
      throw new UnauthorizedException('Refresh token was revoked');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.revokedTokensRepository.save(
      this.revokedTokensRepository.create({
        tokenId: payload.jti,
        userId: user.id,
        expiresAt: new Date(payload.exp * 1000),
      }),
    );

    return this.tokenService.issueTokenPair(user.id, user.role);
  }
}
