import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMatriculaMunicipalToStudent1781784272590
  implements MigrationInterface
{
  name = 'AddMatriculaMunicipalToStudent1781784272590'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno\` ADD \`ALU_MATRICULA_MUNICIPAL\` varchar(100) NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno\` DROP COLUMN \`ALU_MATRICULA_MUNICIPAL\``,
    )
  }
}
