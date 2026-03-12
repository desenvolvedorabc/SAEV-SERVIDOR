import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEditionTypeToAssessment1760600000000
  implements MigrationInterface
{
  name = 'AddEditionTypeToAssessment1760600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao\` ADD \`AVA_TIPO\` enum('GERAL', 'ESPECIFICO') NOT NULL DEFAULT 'ESPECIFICO'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao\` DROP COLUMN \`AVA_TIPO\``,
    )
  }
}
