import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnLeituraHerby1760364550699 implements MigrationInterface {
  name = 'AddColumnLeituraHerby1760364550699'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`MUN_LEITURA_HERBY_ATIVO\` tinyint NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`MUN_LEITURA_HERBY_ATIVO\``,
    )
  }
}
