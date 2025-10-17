import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIndexStudentTest1751153232002 implements MigrationInterface {
  name = 'AddIndexStudentTest1751153232002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_2388c8e57f675bc9d1cdfad567\` ON \`aluno_teste\` (\`ALT_TES_ID\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_2388c8e57f675bc9d1cdfad567\` ON \`aluno_teste\``,
    )
  }
}
