import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateOutboxEvents1750469000000 implements MigrationInterface {
  name = 'CreateOutboxEvents1750469000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`
        CREATE TYPE "outbox_events_status_enum" AS ENUM (
          'pending',
          'processing',
          'published',
          'failed'
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "outbox_events" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "topic" character varying(255) NOT NULL,
          "event_key" character varying(255) NOT NULL,
          "payload" jsonb NOT NULL,
          "status" "outbox_events_status_enum" NOT NULL DEFAULT 'pending',
          "attempts" integer NOT NULL DEFAULT 0,
          "last_error" text,
          "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "published_at" TIMESTAMP WITH TIME ZONE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_outbox_events_id" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_outbox_events_ready"
        ON "outbox_events" ("status", "next_attempt_at", "created_at")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_outbox_events_topic_key"
        ON "outbox_events" ("topic", "event_key")
      `);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('DROP INDEX "IDX_outbox_events_topic_key"');
      await queryRunner.query('DROP INDEX "IDX_outbox_events_ready"');
      await queryRunner.query('DROP TABLE "outbox_events"');
      await queryRunner.query('DROP TYPE "outbox_events_status_enum"');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
