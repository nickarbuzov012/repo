import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../features/users/entities/user.entity';

@Entity('endpoint_policies')
@Unique('UQ_endpoint_policies_method_path', ['method', 'path'])
export class EndpointPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ name: 'is_configured', type: 'boolean', default: true })
  isConfigured: boolean;

  @Column({ name: 'is_protected', type: 'boolean', default: true })
  isProtected: boolean;

  @Column({
    name: 'allow_roles',
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [],
  })
  allowRoles: UserRole[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
