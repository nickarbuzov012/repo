import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeResponse } from '../contracts/auth.contracts';
import { UserEntity } from '../../users/entities/user.entity';
import { CacheService } from '../../../providers/cache/cache.service';

export class GetMeQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery, MeResponse> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetMeQuery): Promise<MeResponse> {
    const cacheKey = this.cacheService.userProfileKey(query.userId);
    const cached = await this.cacheService.get<MeResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.usersRepository.findOne({
      where: { id: query.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const response: MeResponse = {
      id: user.id,
      login: user.login,
      email: user.email,
      age: user.age,
      description: user.description,
      balance: user.balance,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    await this.cacheService.set(cacheKey, response);
    return response;
  }
}
