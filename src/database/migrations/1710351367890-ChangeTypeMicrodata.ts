import { MigrationInterface, QueryRunner } from 'typeorm'

export class ChangeTypeMicrodata1710351367890 implements MigrationInterface {
  name = 'ChangeTypeMicrodata1710351367890'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` CHANGE \`type\` \`type\` enum ('AVALIACAO', 'ALUNOS', 'INFREQUENCIA', 'TEMPLATE_AVALIACAO') NOT NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` CHANGE \`type\` \`type\` enum ('AVALIACAO', 'ALUNOS', 'INFREQUENCIA') NOT NULL`,
    )
  }
}
