import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from '../../providers/s3/s3.module';
import { FileEntity } from '../../providers/files/entities/file.entity';
import { DeleteAvatarHandler } from './commands/delete-avatar.command-handler';
import { DeleteMyProfileHandler } from './commands/delete-my-profile.command-handler';
import { TransferBalanceHandler } from './commands/transfer-balance.command-handler';
import { UploadAvatarHandler } from './commands/upload-avatar.command-handler';
import { UpdateMyProfileHandler } from './commands/update-my-profile.command-handler';
import { UserEntity } from './entities/user.entity';
import { AvatarEntity } from './entities/avatar.entity';
import { ListUsersHandler } from './queries/list-users.query-handler';
import { ListActiveUsersHandler } from './queries/list-active-users.query-handler';
import { UsersController } from './users.controller';

const commandHandlers = [
  UpdateMyProfileHandler,
  DeleteMyProfileHandler,
  UploadAvatarHandler,
  DeleteAvatarHandler,
  TransferBalanceHandler,
];
const queryHandlers = [ListUsersHandler, ListActiveUsersHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([UserEntity, AvatarEntity, FileEntity]),
    AuthModule,
    S3Module,
  ],
  controllers: [UsersController],
  providers: [...commandHandlers, ...queryHandlers],
})
export class UsersModule {}
