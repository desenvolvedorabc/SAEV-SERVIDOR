import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTypeSchoolInMicrodata1719601631443
  implements MigrationInterface
{
  name = 'AddTypeSchoolInMicrodata1719601631443'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` ADD \`typeSchool\` enum ('MUNICIPAL', 'ESTADUAL') NOT NULL DEFAULT 'MUNICIPAL'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` DROP COLUMN \`typeSchool\``,
    )
  }
}
