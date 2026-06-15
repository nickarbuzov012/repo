import { UserRole } from '../../users/entities/user.entity';

export interface RegisterRequest {
  login: string;
  email: string;
  password: string;
  age: number;
  description: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface MeResponse {
  id: string;
  login: string;
  email: string;
  age: number;
  description: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
