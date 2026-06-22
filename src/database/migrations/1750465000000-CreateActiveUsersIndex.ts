import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActiveUsersIndex1750465000000
  implements MigrationInterface
{
  name = 'CreateActiveUsersIndex1750465000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_users_active_age_created"
      ON "users" ("age", "created_at" DESC, "id" DESC)
      WHERE "deleted_at" IS NULL AND BTRIM("description") <> ''
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_users_active_age_created"');
  }
}
