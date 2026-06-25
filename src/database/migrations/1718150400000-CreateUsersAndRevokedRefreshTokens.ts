import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndRevokedRefreshTokens1718150400000
  implements MigrationInterface
{
  name = 'CreateUsersAndRevokedRefreshTokens1718150400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

      await queryRunner.query(`
        CREATE TYPE "public"."users_role_enum" AS ENUM ('user', 'admin')
      `);

      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "login" character varying(64) NOT NULL,
          "email" character varying(320) NOT NULL,
          "password_hash" character varying(255) NOT NULL,
          "age" integer NOT NULL,
          "description" character varying(1000) NOT NULL,
          "roles" "public"."users_role_enum"[] NOT NULL DEFAULT ARRAY['user']::"public"."users_role_enum"[],
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "deleted_at" TIMESTAMP WITH TIME ZONE,
          CONSTRAINT "UQ_users_login" UNIQUE ("login"),
          CONSTRAINT "UQ_users_email" UNIQUE ("email"),
          CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "revoked_refresh_tokens" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "token_id" uuid NOT NULL,
          "user_id" uuid NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_revoked_refresh_tokens_token_id" UNIQUE ("token_id"),
          CONSTRAINT "PK_revoked_refresh_tokens_id" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        ALTER TABLE "revoked_refresh_tokens"
        ADD CONSTRAINT "FK_revoked_refresh_tokens_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_revoked_refresh_tokens_user_id"
        ON "revoked_refresh_tokens" ("user_id")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_revoked_refresh_tokens_expires_at"
        ON "revoked_refresh_tokens" ("expires_at")
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
      await queryRunner.query(
        'DROP INDEX "IDX_revoked_refresh_tokens_expires_at"',
      );
      await queryRunner.query('DROP INDEX "IDX_revoked_refresh_tokens_user_id"');
      await queryRunner.query(
        'ALTER TABLE "revoked_refresh_tokens" DROP CONSTRAINT "FK_revoked_refresh_tokens_user_id"',
      );
      await queryRunner.query('DROP TABLE "revoked_refresh_tokens"');
      await queryRunner.query('DROP TABLE "users"');
      await queryRunner.query('DROP TYPE "public"."users_role_enum"');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
