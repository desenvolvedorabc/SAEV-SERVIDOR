import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateMicrodata1692649824342 implements MigrationInterface {
    name = 'CreateMicrodata1692649824342'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`microdata\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`type\` enum ('AVALIACAO', 'ALUNOS', 'INFREQUENCIA') NOT NULL, \`file\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`countyMUNID\` mediumint NULL, \`userUSUID\` mediumint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`microdata\` ADD CONSTRAINT \`FK_a53d486a80cf4372fe67d4e654d\` FOREIGN KEY (\`countyMUNID\`) REFERENCES \`municipio\`(\`MUN_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`microdata\` ADD CONSTRAINT \`FK_530aedcfa675fb07ed61101f039\` FOREIGN KEY (\`userUSUID\`) REFERENCES \`usuario\`(\`USU_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`microdata\` DROP FOREIGN KEY \`FK_530aedcfa675fb07ed61101f039\``);
        await queryRunner.query(`ALTER TABLE \`microdata\` DROP FOREIGN KEY \`FK_a53d486a80cf4372fe67d4e654d\``);
        await queryRunner.query(`DROP TABLE \`microdata\``);
    }

}
