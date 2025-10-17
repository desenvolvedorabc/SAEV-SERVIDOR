import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnFornecedorAlunoTeste1710957591403
  implements MigrationInterface
{
  name = 'AddColumnFornecedorAlunoTeste1710957591403'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno_teste\` ADD \`ALT_FORNECEDOR\` varchar(255) NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno_teste\` DROP COLUMN \`ALT_FORNECEDOR\``,
    )
  }
}
