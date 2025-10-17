import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNewOptionEnum1753407279141 implements MigrationInterface {
  name = 'AddNewOptionEnum1753407279141'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` CHANGE \`type\` \`type\` enum ('AVALIACAO', 'AVALIACAO_NORMALIZADA', 'ALUNOS', 'INFREQUENCIA', 'TEMPLATE_AVALIACAO') NOT NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` CHANGE \`type\` \`type\` enum ('AVALIACAO', 'ALUNOS', 'INFREQUENCIA', 'TEMPLATE_AVALIACAO') NOT NULL`,
    )
  }
}
