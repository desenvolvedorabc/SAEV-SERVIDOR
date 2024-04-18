import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExternalReport1693318561126 implements MigrationInterface {
  name = "CreateExternalReport1693318561126";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`external_reports\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`category\` varchar(255) NOT NULL, \`role\` enum ('Escola', 'Município', 'SAEV') NOT NULL, \`link\` varchar(255) NOT NULL, \`description\` longtext NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`external_reports\``);
  }
}
