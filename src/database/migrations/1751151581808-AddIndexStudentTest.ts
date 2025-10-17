import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIndexStudentTest1751151581808 implements MigrationInterface {
  name = 'AddIndexStudentTest1751151581808'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_e154a5a4ab413631ae502a4af8\` ON \`aluno_teste\` (\`schoolClassTURID\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_e154a5a4ab413631ae502a4af8\` ON \`aluno_teste\``,
    )
  }
}
