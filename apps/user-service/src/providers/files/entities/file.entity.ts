import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('files')
@Unique('UQ_files_storage_key', ['storageKey'])
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 64 })
  mimeType: string;

  @Column({ type: 'integer' })
  size: number;

  @Column({ type: 'varchar', length: 64 })
  hash: string;

  @Column({ name: 'hash_algorithm', type: 'varchar', length: 32 })
  hashAlgorithm: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
