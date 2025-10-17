import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnsCounty1757700488093 implements MigrationInterface {
  name = 'AddColumnsCounty1757700488093'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`MUN_MENSAGEM_WHATSAPP_ATIVO\` tinyint NOT NULL DEFAULT 0`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`MUN_MENSAGEM_EMAIL_ATIVO\` tinyint NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`MUN_MENSAGEM_EMAIL_ATIVO\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`MUN_MENSAGEM_WHATSAPP_ATIVO\``,
    )
  }
}
