import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnWhatsapp1755798781336 implements MigrationInterface {
  name = 'AddColumnWhatsapp1755798781336'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno\` ADD \`ALU_WHATSAPP\` varchar(16) NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aluno\` DROP COLUMN \`ALU_WHATSAPP\``,
    )
  }
}
