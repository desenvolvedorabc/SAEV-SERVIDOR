import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnCompartilharDadosInCounty1713533112626
  implements MigrationInterface
{
  name = 'AddColumnCompartilharDadosInCounty1713533112626'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`MUN_COMPARTILHAR_DADOS\` tinyint NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`MUN_COMPARTILHAR_DADOS\``,
    )
  }
}
