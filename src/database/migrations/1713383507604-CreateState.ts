import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateState1713383507604 implements MigrationInterface {
  name = 'CreateState1713383507604'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`estados\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`abbreviation\` varchar(2) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_40d11cb0f409d1271525825ae3\` (\`name\`), UNIQUE INDEX \`IDX_246802cdf96470c66313a01608\` (\`abbreviation\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`stateId\` mediumint NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD CONSTRAINT \`FK_f2a75214ea7adf842fc2bd880ff\` FOREIGN KEY (\`stateId\`) REFERENCES \`estados\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP FOREIGN KEY \`FK_f2a75214ea7adf842fc2bd880ff\``,
    )
    await queryRunner.query(`ALTER TABLE \`municipio\` DROP COLUMN \`stateId\``)
    await queryRunner.query(
      `DROP INDEX \`IDX_246802cdf96470c66313a01608\` ON \`estados\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_40d11cb0f409d1271525825ae3\` ON \`estados\``,
    )
    await queryRunner.query(`DROP TABLE \`estados\``)
  }
}
