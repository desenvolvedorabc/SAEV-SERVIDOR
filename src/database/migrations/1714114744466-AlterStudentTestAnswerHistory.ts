import { MigrationInterface, QueryRunner } from 'typeorm'

export class AlterStudentTestAnswerHistory1714114744466
  implements MigrationInterface
{
  name = 'AlterStudentTestAnswerHistory1714114744466'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno_teste_resposta_historico\` ADD \`ATH_ALT_ID\` int NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`aluno_teste_resposta_historico\` CHANGE \`ATH_TEG_ID\` \`ATH_TEG_ID\` int NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno_teste_resposta_historico\` CHANGE \`ATH_TEG_ID\` \`ATH_TEG_ID\` int NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`aluno_teste_resposta_historico\` DROP COLUMN \`ATH_ALT_ID\``,
    )
  }
}
