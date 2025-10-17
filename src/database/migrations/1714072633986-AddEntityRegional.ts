import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEntityRegional1714072633986 implements MigrationInterface {
  name = 'AddEntityRegional1714072633986'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`regionais\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`type\` enum ('ESTADUAL', 'MUNICIPAL', 'UNICA') NOT NULL, \`stateId\` mediumint NULL, \`countyId\` mediumint NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` ADD \`municipalRegionalId\` mediumint NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`stateRegionalId\` mediumint NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`regionais\` ADD CONSTRAINT \`FK_e41d1e7bf62088870f72ebb20c6\` FOREIGN KEY (\`stateId\`) REFERENCES \`estados\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`regionais\` ADD CONSTRAINT \`FK_e82de00c586bad5bd0b51e345b0\` FOREIGN KEY (\`countyId\`) REFERENCES \`municipio\`(\`MUN_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` ADD CONSTRAINT \`FK_a577bf4e2c96ebab20aefbbc075\` FOREIGN KEY (\`municipalRegionalId\`) REFERENCES \`regionais\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD CONSTRAINT \`FK_87f88a74ce9c80e03a8d0c5c682\` FOREIGN KEY (\`stateRegionalId\`) REFERENCES \`regionais\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP FOREIGN KEY \`FK_87f88a74ce9c80e03a8d0c5c682\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` DROP FOREIGN KEY \`FK_a577bf4e2c96ebab20aefbbc075\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regionais\` DROP FOREIGN KEY \`FK_e82de00c586bad5bd0b51e345b0\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regionais\` DROP FOREIGN KEY \`FK_e41d1e7bf62088870f72ebb20c6\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`stateRegionalId\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` DROP COLUMN \`municipalRegionalId\``,
    )
    await queryRunner.query(`DROP TABLE \`regionais\``)
  }
}
