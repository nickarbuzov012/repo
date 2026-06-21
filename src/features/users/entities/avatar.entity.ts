import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import type { AvatarMimeType } from '../avatar.constants';

@Entity('avatars')
@Index('IDX_avatars_user_active_created', ['userId', 'createdAt'], {
  where: '"deleted_at" IS NULL',
})
export class AvatarEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, unique: true })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 32 })
  mimeType: AvatarMimeType;

  @Column({ type: 'integer' })
  size: number;

  @ManyToOne(() => UserEntity, (user) => user.avatars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
