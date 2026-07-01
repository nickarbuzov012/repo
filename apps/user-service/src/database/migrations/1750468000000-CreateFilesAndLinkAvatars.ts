import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateFilesAndLinkAvatars1750468000000 implements MigrationInterface {
  name = 'CreateFilesAndLinkAvatars1750468000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`
        CREATE TABLE "files" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "storage_key" character varying(255) NOT NULL,
          "mime_type" character varying(64) NOT NULL,
          "size" integer NOT NULL,
          "hash" character varying(64) NOT NULL,
          "hash_algorithm" character varying(32) NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_files_storage_key" UNIQUE ("storage_key"),
          CONSTRAINT "PK_files_id" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        ALTER TABLE "avatars"
        ADD "file_id" uuid
      `);

      await queryRunner.query(`
        INSERT INTO "files" (
          "storage_key",
          "mime_type",
          "size",
          "hash",
          "hash_algorithm",
          "created_at"
        )
        SELECT
          "file_name",
          "mime_type",
          "size",
          '',
          'sha256',
          "created_at"
        FROM "avatars"
      `);

      await queryRunner.query(`
        UPDATE "avatars" avatar
        SET "file_id" = file."id"
        FROM "files" file
        WHERE file."storage_key" = avatar."file_name"
      `);

      await queryRunner.query(`
        ALTER TABLE "avatars"
        ALTER COLUMN "file_id" SET NOT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "avatars"
        ADD CONSTRAINT "FK_avatars_file_id"
        FOREIGN KEY ("file_id") REFERENCES "files"("id")
        ON DELETE RESTRICT
        ON UPDATE NO ACTION
      `);

      await queryRunner.query('ALTER TABLE "avatars" DROP COLUMN "file_name"');
      await queryRunner.query('ALTER TABLE "avatars" DROP COLUMN "mime_type"');
      await queryRunner.query('ALTER TABLE "avatars" DROP COLUMN "size"');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`
        ALTER TABLE "avatars"
        ADD "file_name" character varying(255)
      `);
      await queryRunner.query(`
        ALTER TABLE "avatars"
        ADD "mime_type" character varying(32)
      `);
      await queryRunner.query(`
        ALTER TABLE "avatars"
        ADD "size" integer
      `);

      await queryRunner.query(`
        UPDATE "avatars" avatar
        SET
          "file_name" = file."storage_key",
          "mime_type" = file."mime_type",
          "size" = file."size"
        FROM "files" file
        WHERE file."id" = avatar."file_id"
      `);

      await queryRunner.query(`
        ALTER TABLE "avatars"
        ALTER COLUMN "file_name" SET NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "avatars"
        ALTER COLUMN "mime_type" SET NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "avatars"
        ALTER COLUMN "size" SET NOT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "avatars"
        ADD CONSTRAINT "UQ_avatars_file_name" UNIQUE ("file_name")
      `);
      await queryRunner.query(
        'ALTER TABLE "avatars" DROP CONSTRAINT "FK_avatars_file_id"',
      );
      await queryRunner.query('ALTER TABLE "avatars" DROP COLUMN "file_id"');
      await queryRunner.query('DROP TABLE "files"');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
