import { ILike, Repository } from 'typeorm';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UsersListQuery,
  UsersListResponse,
} from '../contracts/users.contracts';
import { UserEntity } from '../entities/user.entity';
import { toUserProfile } from '../users.mapper';

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
  ) {}

  async execute(query: ListUsersQuery): Promise<UsersListResponse> {
    const { page, limit, search } = query.payload;
    const [users, total] = await this.usersRepository.findAndCount({
      where: search ? { login: ILike(`%${search}%`) } : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: users.map(toUserProfile),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
