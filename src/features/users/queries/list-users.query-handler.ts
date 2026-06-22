import { ILike, Repository } from 'typeorm';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UsersListQuery,
  UsersListResponse,
} from '../contracts/users.contracts';
import { UserEntity } from '../entities/user.entity';
import { toUserProfile } from '../users.mapper';
import { CacheService } from '../../../providers/cache/cache.service';

export class ListUsersQuery {
  constructor(public readonly payload: UsersListQuery) {}
}

@QueryHandler(ListUsersQuery)
export class ListUsersHandler
  implements IQueryHandler<ListUsersQuery, UsersListResponse>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: ListUsersQuery): Promise<UsersListResponse> {
    const { page, limit, search } = query.payload;
    const cacheKey = await this.cacheService.usersListKey('all', {
      page,
      limit,
      search,
    });
    const cached = await this.cacheService.get<UsersListResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where: search ? { login: ILike(`%${search}%`) } : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const response: UsersListResponse = {
      items: users.map(toUserProfile),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    await this.cacheService.set(cacheKey, response);
    return response;
  }
}
