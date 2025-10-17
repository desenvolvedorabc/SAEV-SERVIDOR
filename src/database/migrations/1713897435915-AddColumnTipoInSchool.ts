import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnTipoInSchool1713897435915 implements MigrationInterface {
  name = 'AddColumnTipoInSchool1713897435915'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`escola\` ADD \`ESC_TIPO\` enum ('MUNICIPAL', 'ESTADUAL') NOT NULL DEFAULT 'MUNICIPAL'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`escola\` DROP COLUMN \`ESC_TIPO\``)
  }
}
