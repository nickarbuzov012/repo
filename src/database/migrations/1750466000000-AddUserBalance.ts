import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddUserBalance1750466000000 implements MigrationInterface {
  name = 'AddUserBalance1750466000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "balance" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_balance_non_negative" CHECK ("balance" >= 0)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "CHK_users_balance_non_negative"
    `);
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "balance"');
  }
}
