import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNewColumnsMicrodata1751149665220 implements MigrationInterface {
  name = 'AddNewColumnsMicrodata1751149665220'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` ADD \`stateId\` mediumint NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`microdata\` ADD \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`microdata\` CHANGE \`status\` \`status\` enum ('IN_PROGRESS', 'SUCCESS', 'ERROR') NOT NULL DEFAULT 'IN_PROGRESS'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`microdata\` ADD CONSTRAINT \`FK_5c3162cf4e5ef834dae23f943ad\` FOREIGN KEY (\`stateId\`) REFERENCES \`estados\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`microdata\` DROP FOREIGN KEY \`FK_5c3162cf4e5ef834dae23f943ad\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`microdata\` CHANGE \`status\` \`status\` enum ('IN_PROGRESS', 'SUCCESS') NOT NULL DEFAULT 'IN_PROGRESS'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`microdata\` DROP COLUMN \`updatedAt\``,
    )
    await queryRunner.query(`ALTER TABLE \`microdata\` DROP COLUMN \`stateId\``)
  }
}
