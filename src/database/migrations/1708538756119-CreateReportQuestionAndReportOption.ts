import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateReportQuestionAndReportOption1708538756119 implements MigrationInterface {
    name = 'CreateReportQuestionAndReportOption1708538756119'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`report_question_option\` (\`id\` int NOT NULL AUTO_INCREMENT, \`option\` varchar(255) NOT NULL, \`totalCorrect\` int NOT NULL DEFAULT '0', \`fluente\` int NOT NULL DEFAULT '0', \`nao_fluente\` int NOT NULL DEFAULT '0', \`frases\` int NOT NULL DEFAULT '0', \`palavras\` int NOT NULL DEFAULT '0', \`silabas\` int NOT NULL DEFAULT '0', \`nao_leitor\` int NOT NULL DEFAULT '0', \`nao_avaliado\` int NOT NULL DEFAULT '0', \`nao_informado\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`reportQuestionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`report_question\` (\`id\` int NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`questionTEGID\` mediumint NULL, \`reportSubjectId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`report_question_option\` ADD CONSTRAINT \`FK_809feeee2793a94f8dee0eb5225\` FOREIGN KEY (\`reportQuestionId\`) REFERENCES \`report_question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`report_question\` ADD CONSTRAINT \`FK_aeac036e717b9949f3c63071680\` FOREIGN KEY (\`questionTEGID\`) REFERENCES \`teste_gabarito\`(\`TEG_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`report_question\` ADD CONSTRAINT \`FK_9f0c40caeb097863716cff4115b\` FOREIGN KEY (\`reportSubjectId\`) REFERENCES \`report_subject\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`report_question\` DROP FOREIGN KEY \`FK_9f0c40caeb097863716cff4115b\``);
        await queryRunner.query(`ALTER TABLE \`report_question\` DROP FOREIGN KEY \`FK_aeac036e717b9949f3c63071680\``);
        await queryRunner.query(`ALTER TABLE \`report_question_option\` DROP FOREIGN KEY \`FK_809feeee2793a94f8dee0eb5225\``);
        await queryRunner.query(`DROP TABLE \`report_question\``);
        await queryRunner.query(`DROP TABLE \`report_question_option\``);
    }

}
