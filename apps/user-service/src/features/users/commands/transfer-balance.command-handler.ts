import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { POSTGRES_INTEGER_MAX } from '../../../common/validation/minor-unit.schema';
import { UserCacheService } from '../../../providers/cache/user-cache.service';
import { UserEntity } from '../entities/user.entity';

export class TransferBalanceCommand {
  constructor(
    public readonly senderId: string,
    public readonly recipientId: string,
    public readonly amountCents: number,
  ) {}
}

@CommandHandler(TransferBalanceCommand)
export class TransferBalanceHandler implements ICommandHandler<
  TransferBalanceCommand,
  void
> {
  private readonly logger = new Logger(TransferBalanceHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: UserCacheService,
  ) {}

  async execute(command: TransferBalanceCommand): Promise<void> {
    if (command.senderId === command.recipientId) {
      throw new BadRequestException('Cannot transfer balance to yourself');
    }

    const transferId = randomUUID();

    await this.dataSource.transaction(async (manager) => {
      const [firstUserId, secondUserId] = [
        command.senderId,
        command.recipientId,
      ].sort();

      const users = await manager.find(UserEntity, {
        where: { id: In([firstUserId, secondUserId]) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const usersById = new Map(users.map((user) => [user.id, user]));
      const sender = usersById.get(command.senderId);
      const recipient = usersById.get(command.recipientId);

      if (!sender) {
        throw new NotFoundException('Sender not found');
      }

      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }

      if (sender.balance < command.amountCents) {
        throw new ConflictException('Insufficient balance');
      }

      if (recipient.balance > POSTGRES_INTEGER_MAX - command.amountCents) {
        throw new ConflictException('Recipient balance limit exceeded');
      }

      const debitResult = await manager
        .createQueryBuilder()
        .update(UserEntity)
        .set({ balance: () => '"balance" - :amountCents' })
        .where('id = :senderId', { senderId: command.senderId })
        .andWhere('balance >= :amountCents', {
          amountCents: command.amountCents,
        })
        .setParameters({ amountCents: command.amountCents })
        .execute();

      if (!debitResult.affected) {
        throw new ConflictException('Insufficient balance');
      }

      await manager
        .createQueryBuilder()
        .update(UserEntity)
        .set({ balance: () => '"balance" + :amountCents' })
        .where('id = :recipientId', { recipientId: command.recipientId })
        .setParameters({ amountCents: command.amountCents })
        .execute();
    });

    await Promise.all([
      this.cacheService.invalidateUser(command.senderId),
      this.cacheService.invalidateUser(command.recipientId),
    ]);

    this.logger.log(
      `Transferred balance: transferId=${transferId} senderId=${command.senderId} recipientId=${command.recipientId}`,
    );
  }
}
