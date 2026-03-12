import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateColumnTransferNotificado1772150748697
  implements MigrationInterface
{
  name = 'CreateColumnTransferNotificado1772150748697'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`transferencia\` ADD \`TRF_NOTIFICADO\` tinyint NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`transferencia\` DROP COLUMN \`TRF_NOTIFICADO\``,
    )
  }
}
