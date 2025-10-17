import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTypeReportEdition1717534349305 implements MigrationInterface {
  name = 'AddTypeReportEdition1717534349305'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_c6d5b9b0b9da72af611b8e089d\` ON \`report_edition\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_edition\` ADD \`type\` enum ('MUNICIPAL', 'ESTADUAL') NOT NULL DEFAULT 'MUNICIPAL'`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_c45a49f79ec054e2b6036339c6\` ON \`report_edition\` (\`schoolClassTURID\`, \`schoolESCID\`, \`countyMUNID\`, \`regionalId\`, \`type\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_0d105e81e9140507b0eedf6c83\` ON \`report_edition\` (\`type\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_0d105e81e9140507b0eedf6c83\` ON \`report_edition\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_c45a49f79ec054e2b6036339c6\` ON \`report_edition\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_edition\` DROP COLUMN \`type\``,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_c6d5b9b0b9da72af611b8e089d\` ON \`report_edition\` (\`schoolClassTURID\`, \`schoolESCID\`, \`countyMUNID\`, \`regionalId\`)`,
    )
  }
}
