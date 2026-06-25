import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateAvatars1750464000000 implements MigrationInterface {
  name = 'CreateAvatars1750464000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "avatars" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "mime_type" character varying(32) NOT NULL,
        "size" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_avatars_file_name" UNIQUE ("file_name"),
        CONSTRAINT "PK_avatars_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "avatars"
      ADD CONSTRAINT "FK_avatars_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_avatars_user_active_created"
      ON "avatars" ("user_id", "created_at" DESC)
      WHERE "deleted_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_avatars_user_active_created"');
    await queryRunner.query(
      'ALTER TABLE "avatars" DROP CONSTRAINT "FK_avatars_user_id"',
    );
    await queryRunner.query('DROP TABLE "avatars"');
  }
}
