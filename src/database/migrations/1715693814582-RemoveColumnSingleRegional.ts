import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveColumnSingleRegional1715693814582
  implements MigrationInterface
{
  name = 'RemoveColumnSingleRegional1715693814582'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP FOREIGN KEY \`FK_6a63dcf74becceedd0cd88f542e\``,
    )
    await queryRunner.query(
      `DROP INDEX \`REL_6a63dcf74becceedd0cd88f542\` ON \`municipio\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`singleRegionalId\``,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`singleRegionalId\` mediumint NULL`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6a63dcf74becceedd0cd88f542\` ON \`municipio\` (\`singleRegionalId\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD CONSTRAINT \`FK_6a63dcf74becceedd0cd88f542e\` FOREIGN KEY (\`singleRegionalId\`) REFERENCES \`regionais\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }
}
