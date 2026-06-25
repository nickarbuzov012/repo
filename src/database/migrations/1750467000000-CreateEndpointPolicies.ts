import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateEndpointPolicies1750467000000 implements MigrationInterface {
  name = 'CreateEndpointPolicies1750467000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`
        CREATE TABLE "endpoint_policies" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "method" character varying(16) NOT NULL,
          "path" character varying(255) NOT NULL,
          "is_configured" boolean NOT NULL DEFAULT true,
          "is_protected" boolean NOT NULL DEFAULT true,
          "allow_roles" "public"."users_role_enum"[] NOT NULL DEFAULT '{}',
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_endpoint_policies_method_path" UNIQUE ("method", "path"),
          CONSTRAINT "PK_endpoint_policies_id" PRIMARY KEY ("id")
        )
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
      await queryRunner.query('DROP TABLE "endpoint_policies"');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
