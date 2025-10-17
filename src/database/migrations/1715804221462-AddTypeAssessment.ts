import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTypeAssessment1715804221462 implements MigrationInterface {
  name = 'AddTypeAssessment1715804221462'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` ADD \`AVM_TIPO\` enum ('MUNICIPAL', 'ESTADUAL') NOT NULL DEFAULT 'MUNICIPAL'`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_09896bbd755ef449e8d3906208\` ON \`avaliacao_municipio\` (\`AVM_MUN_ID\`, \`AVM_AVA_ID\`, \`AVM_TIPO\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_09896bbd755ef449e8d3906208\` ON \`avaliacao_municipio\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`avaliacao_municipio\` DROP COLUMN \`AVM_TIPO\``,
    )
  }
}
