import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DeleteMyProfileHandler } from './commands/delete-my-profile.command-handler';
import { UpdateMyProfileHandler } from './commands/update-my-profile.command-handler';
import { UserEntity } from './entities/user.entity';
import { ListUsersHandler } from './queries/list-users.query-handler';
import { UsersController } from './users.controller';

const commandHandlers = [UpdateMyProfileHandler, DeleteMyProfileHandler];
const queryHandlers = [ListUsersHandler];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([UserEntity]), AuthModule],
  controllers: [UsersController],
  providers: [...commandHandlers, ...queryHandlers],
})
export class UsersModule {}
