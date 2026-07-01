import { Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedRefreshTokenEntity } from '../entities/revoked-refresh-token.entity';
import { TokenPair, TokenService } from '../services/token.service';
import { UserEntity } from '../../users/entities/user.entity';

export class RefreshTokenCommand {
  constructor(public readonly refreshToken: string) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, TokenPair>
{
  private readonly logger = new Logger(RefreshTokenHandler.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RevokedRefreshTokenEntity)
    private readonly revokedTokensRepository: Repository<RevokedRefreshTokenEntity>,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<TokenPair> {
    const payload = this.tokenService.verifyRefreshToken(command.refreshToken);

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

    this.logger.log(`Rotated refresh token: userId=${user.id}`);

    return this.tokenService.issueTokenPair(user.id, user.roles);
  }
}
