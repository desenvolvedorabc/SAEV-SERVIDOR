import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddParceiroEPVInCounty1713449550208 implements MigrationInterface {
  name = 'AddParceiroEPVInCounty1713449550208'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`MUN_PARCEIRO_EPV\` tinyint NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`MUN_PARCEIRO_EPV\``,
    )
  }
}
