import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnRegionalInReport1716927665797
  implements MigrationInterface
{
  name = 'AddColumnRegionalInReport1716927665797'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_8c6a1a81b0929395bdabe730b7\` ON \`report_edition\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_edition\` ADD \`regionalId\` mediumint NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_c6d5b9b0b9da72af611b8e089d\` ON \`report_edition\` (\`schoolClassTURID\`, \`schoolESCID\`, \`countyMUNID\`, \`regionalId\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_9d244b2a23788fef2e0ff66cc5\` ON \`report_edition\` (\`regionalId\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_edition\` ADD CONSTRAINT \`FK_9d244b2a23788fef2e0ff66cc55\` FOREIGN KEY (\`regionalId\`) REFERENCES \`regionais\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`report_edition\` DROP FOREIGN KEY \`FK_9d244b2a23788fef2e0ff66cc55\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_9d244b2a23788fef2e0ff66cc5\` ON \`report_edition\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_c6d5b9b0b9da72af611b8e089d\` ON \`report_edition\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`report_edition\` DROP COLUMN \`regionalId\``,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_8c6a1a81b0929395bdabe730b7\` ON \`report_edition\` (\`schoolClassTURID\`, \`schoolESCID\`, \`countyMUNID\`)`,
    )
  }
}
