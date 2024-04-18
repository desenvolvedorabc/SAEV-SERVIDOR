import {MigrationInterface, QueryRunner} from "typeorm";

export class AssessmentOnline1690399848727 implements MigrationInterface {
    name = 'AssessmentOnline1690399848727'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`avaliacao_online\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`avaliacao_online_question_alternative\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`option\` varchar(255) NOT NULL, \`description\` longtext NULL, \`image\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`questionId\` mediumint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`avaliacao_online_question\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`description\` longtext NOT NULL, \`order\` int NULL, \`questionTemplateId\` mediumint NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`pageId\` mediumint NULL, UNIQUE INDEX \`REL_44c42a9f3e08a342340a5ba16d\` (\`questionTemplateId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`avaliacao_online_page\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`image\` varchar(255) NULL, \`order\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`assessmentOnlineId\` mediumint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`teste\` ADD \`assessmentOnlineId\` mediumint NULL`);
        await queryRunner.query(`ALTER TABLE \`teste\` ADD UNIQUE INDEX \`IDX_354508ce043f8e314f8dcaa9c0\` (\`assessmentOnlineId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_354508ce043f8e314f8dcaa9c0\` ON \`teste\` (\`assessmentOnlineId\`)`);
        await queryRunner.query(`ALTER TABLE \`teste\` ADD CONSTRAINT \`FK_354508ce043f8e314f8dcaa9c05\` FOREIGN KEY (\`assessmentOnlineId\`) REFERENCES \`avaliacao_online\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_question_alternative\` ADD CONSTRAINT \`FK_6851e09af66c96936e52ea7f310\` FOREIGN KEY (\`questionId\`) REFERENCES \`avaliacao_online_question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_question\` ADD CONSTRAINT \`FK_530023ff2cd20865bc0e241fbda\` FOREIGN KEY (\`pageId\`) REFERENCES \`avaliacao_online_page\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_question\` ADD CONSTRAINT \`FK_44c42a9f3e08a342340a5ba16d3\` FOREIGN KEY (\`questionTemplateId\`) REFERENCES \`teste_gabarito\`(\`TEG_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_page\` ADD CONSTRAINT \`FK_677e9b2af3e844c9eea7707388c\` FOREIGN KEY (\`assessmentOnlineId\`) REFERENCES \`avaliacao_online\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_page\` DROP FOREIGN KEY \`FK_677e9b2af3e844c9eea7707388c\``);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_question\` DROP FOREIGN KEY \`FK_44c42a9f3e08a342340a5ba16d3\``);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_question\` DROP FOREIGN KEY \`FK_530023ff2cd20865bc0e241fbda\``);
        await queryRunner.query(`ALTER TABLE \`avaliacao_online_question_alternative\` DROP FOREIGN KEY \`FK_6851e09af66c96936e52ea7f310\``);
        await queryRunner.query(`ALTER TABLE \`teste\` DROP FOREIGN KEY \`FK_354508ce043f8e314f8dcaa9c05\``);
        await queryRunner.query(`DROP INDEX \`REL_354508ce043f8e314f8dcaa9c0\` ON \`teste\``);
        await queryRunner.query(`ALTER TABLE \`teste\` DROP INDEX \`IDX_354508ce043f8e314f8dcaa9c0\``);
        await queryRunner.query(`ALTER TABLE \`teste\` DROP COLUMN \`assessmentOnlineId\``);
        await queryRunner.query(`DROP TABLE \`avaliacao_online_page\``);
        await queryRunner.query(`DROP INDEX \`REL_44c42a9f3e08a342340a5ba16d\` ON \`avaliacao_online_question\``);
        await queryRunner.query(`DROP TABLE \`avaliacao_online_question\``);
        await queryRunner.query(`DROP TABLE \`avaliacao_online_question_alternative\``);
        await queryRunner.query(`DROP TABLE \`avaliacao_online\``);
    }

}
