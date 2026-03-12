import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPeriodToAssessment1760500000000 implements MigrationInterface {
  name = 'AddPeriodToAssessment1760500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao\` ADD \`AVA_DT_INICIO\` timestamp NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao\` ADD \`AVA_DT_FIM\` timestamp NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao\` DROP COLUMN \`AVA_DT_FIM\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao\` DROP COLUMN \`AVA_DT_INICIO\``,
    )
  }
}
