import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAffectedTestIdsToJob1779820600000
  implements MigrationInterface
{
  name = 'AddAffectedTestIdsToJob1779820600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`job\` ADD \`affectedTestIds\` text NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`job\` DROP COLUMN \`affectedTestIds\``,
    )
  }
}
