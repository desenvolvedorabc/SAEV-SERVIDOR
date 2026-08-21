import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTableResponsible1770399888930 implements MigrationInterface {
  name = 'CreateTableResponsible1770399888930'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`responsaveis\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NULL, \`email\` varchar(191) NOT NULL, \`avatar\` text NULL, \`password\` varchar(255) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fa6d27edac80042d1b2080cb02\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `CREATE TABLE \`forget_password_responsible\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`responsibleId\` int NOT NULL, \`token\` varchar(255) NOT NULL, \`isValid\` tinyint NOT NULL, \`expiresAt\` timestamp NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`REL_215ba7ab586e8aa9de323ba1a7\` (\`responsibleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(`ALTER TABLE \`aluno\` ADD \`ALU_RES_ID\` int NULL`)
    await queryRunner.query(
      `ALTER TABLE \`aluno\` ADD CONSTRAINT \`FK_4318d401479d86de46997424573\` FOREIGN KEY (\`ALU_RES_ID\`) REFERENCES \`responsaveis\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`forget_password_responsible\` ADD CONSTRAINT \`FK_215ba7ab586e8aa9de323ba1a7e\` FOREIGN KEY (\`responsibleId\`) REFERENCES \`responsaveis\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`forget_password_responsible\` DROP FOREIGN KEY \`FK_215ba7ab586e8aa9de323ba1a7e\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`aluno\` DROP FOREIGN KEY \`FK_4318d401479d86de46997424573\``,
    )
    await queryRunner.query(`ALTER TABLE \`aluno\` DROP COLUMN \`ALU_RES_ID\``)
    await queryRunner.query(
      `DROP INDEX \`REL_215ba7ab586e8aa9de323ba1a7\` ON \`forget_password_responsible\``,
    )
    await queryRunner.query(`DROP TABLE \`forget_password_responsible\``)
    await queryRunner.query(
      `DROP INDEX \`IDX_fa6d27edac80042d1b2080cb02\` ON \`responsaveis\``,
    )
    await queryRunner.query(`DROP TABLE \`responsaveis\``)
  }
}
