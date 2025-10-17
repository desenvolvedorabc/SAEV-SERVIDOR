import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStudentTestAnswerHistory1714111951127
  implements MigrationInterface
{
  name = 'AddStudentTestAnswerHistory1714111951127'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`aluno_teste_resposta_historico\` (\`ATH_ID\` int NOT NULL AUTO_INCREMENT, \`ATH_ATR_ID\` int NOT NULL, \`ATH_ATR_RESPOSTA_ANTIGA\` varchar(255) NULL, \`ATH_ATR_RESPOSTA_NOVA\` varchar(255) NULL, \`ATH_TEG_ID\` int NOT NULL, \`ATH_OPERACAO\` enum ('INSERT', 'UPDATE', 'DELETE') NOT NULL, \`ATH_DT_CRIACAO\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_aae57849a1c91adc24f8b7b0a8\` (\`ATH_DT_CRIACAO\`), PRIMARY KEY (\`ATH_ID\`)) ENGINE=InnoDB`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_aae57849a1c91adc24f8b7b0a8\` ON \`aluno_teste_resposta_historico\``,
    )
    await queryRunner.query(`DROP TABLE \`aluno_teste_resposta_historico\``)
  }
}
