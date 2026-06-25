import { UserEntity } from './entities/user.entity';
import { UserProfile } from './contracts/users.contracts';

export function toUserProfile(user: UserEntity): UserProfile {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    age: user.age,
    description: user.description,
    roles: user.roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
