import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

export class DeleteMyProfileCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(DeleteMyProfileCommand)
export class DeleteMyProfileHandler
  implements ICommandHandler<DeleteMyProfileCommand, void>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async execute(command: DeleteMyProfileCommand): Promise<void> {
    const result = await this.usersRepository.softDelete({ id: command.userId });

    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
  }
}
