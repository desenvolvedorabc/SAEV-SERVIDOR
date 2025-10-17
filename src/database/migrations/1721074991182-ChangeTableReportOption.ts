import { MigrationInterface, QueryRunner } from 'typeorm'

export class ChangeTableReportOption1721074991182
  implements MigrationInterface
{
  name = 'ChangeTableReportOption1721074991182'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`createdAt\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`option_correct\` varchar(1) NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`total_a\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`total_b\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`total_c\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`total_d\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`total_null\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`fluente\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`nao_fluente\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`frases\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`palavras\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`silabas\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`nao_leitor\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`nao_avaliado\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`nao_informado\` int NOT NULL DEFAULT '0'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`nao_informado\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`nao_avaliado\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`nao_leitor\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`silabas\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`palavras\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`frases\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`nao_fluente\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`fluente\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`total_null\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`total_d\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`total_c\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`total_b\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`total_a\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` DROP COLUMN \`option_correct\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_question\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    )
  }
}
