import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OutboxEventStatus {
  Pending = 'pending',
  Processing = 'processing',
  Published = 'published',
  Failed = 'failed',
}

@Entity('outbox_events')
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  topic: string;

  @Column({ name: 'event_key', type: 'varchar', length: 255 })
  eventKey: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    default: OutboxEventStatus.Pending,
  })
  status: OutboxEventStatus;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({
    name: 'next_attempt_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  nextAttemptAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
