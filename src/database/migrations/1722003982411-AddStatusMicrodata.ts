import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStatusMicrodata1722003982411 implements MigrationInterface {
  name = 'AddStatusMicrodata1722003982411'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` ADD \`status\` enum ('IN_PROGRESS', 'SUCCESS') NOT NULL DEFAULT 'IN_PROGRESS'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`microdata\` DROP COLUMN \`status\``)
  }
}
