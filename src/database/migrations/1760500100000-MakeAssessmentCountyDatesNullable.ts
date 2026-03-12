import { MigrationInterface, QueryRunner } from 'typeorm'

export class MakeAssessmentCountyDatesNullable1760500100000
  implements MigrationInterface
{
  name = 'MakeAssessmentCountyDatesNullable1760500100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` MODIFY \`AVM_DT_INICIO\` timestamp NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` MODIFY \`AVM_DT_FIM\` timestamp NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` MODIFY \`AVM_DT_DISPONIVEL\` timestamp NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` MODIFY \`AVM_DT_DISPONIVEL\` timestamp NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` MODIFY \`AVM_DT_FIM\` timestamp NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` MODIFY \`AVM_DT_INICIO\` timestamp NOT NULL`,
    )
  }
}
