import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNivelToTesteGabarito1780336062401
  implements MigrationInterface
{
  name = 'AddNivelToTesteGabarito1780336062401'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`teste_gabarito\` ADD \`TEG_NIVEL\` enum ('BASICO', 'INTERMEDIARIO', 'AVANCADO') NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`teste_gabarito\` DROP COLUMN \`TEG_NIVEL\``,
    )
  }
}
