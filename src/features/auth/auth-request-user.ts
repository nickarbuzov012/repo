import { UserRole } from '../users/entities/user.entity';

export interface AuthRequestUser {
  id: string;
  roles: UserRole[];
}
