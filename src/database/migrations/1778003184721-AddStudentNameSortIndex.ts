import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStudentNameSortIndex1778003184721
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IDX_ALUNO_ESC_NOME ON aluno (ALU_ESC_ID, ALU_NOME)`,
    )
    await queryRunner.query(`CREATE INDEX IDX_ALUNO_NOME ON aluno (ALU_NOME)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_ALUNO_NOME ON aluno`)
    await queryRunner.query(`DROP INDEX IDX_ALUNO_ESC_NOME ON aluno`)
  }
}
