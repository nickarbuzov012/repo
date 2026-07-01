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
import { FileEntity } from '../../../providers/files/entities/file.entity';
import { UserEntity } from './user.entity';

@Entity('avatars')
@Index('IDX_avatars_user_active_created', ['userId', 'createdAt'], {
  where: '"deleted_at" IS NULL',
})
export class AvatarEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @ManyToOne(() => UserEntity, (user) => user.avatars, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => FileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file: FileEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
