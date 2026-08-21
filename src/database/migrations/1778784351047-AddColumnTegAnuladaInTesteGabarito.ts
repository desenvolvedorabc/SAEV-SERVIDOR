import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnTegAnuladaInTesteGabarito1778784351047
  implements MigrationInterface
{
  name = 'AddColumnTegAnuladaInTesteGabarito1778784351047'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`teste_gabarito\` ADD \`TEG_ANULADA\` tinyint NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`teste_gabarito\` DROP COLUMN \`TEG_ANULADA\``,
    )
  }
}
