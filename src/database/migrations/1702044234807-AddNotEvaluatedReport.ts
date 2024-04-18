import {MigrationInterface, QueryRunner} from "typeorm";

export class AddNotEvaluatedReport1702044234807 implements MigrationInterface {
    name = 'AddNotEvaluatedReport1702044234807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`report_not_evaluated\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`type\` enum ('Objetiva', 'Leitura') NOT NULL, \`countTotalStudents\` int NOT NULL DEFAULT '0', \`idStudents\` text NULL, \`countStudentsLaunched\` int NOT NULL DEFAULT '0', \`countPresentStudents\` int NOT NULL DEFAULT '0', \`recusa\` int NOT NULL DEFAULT '0', \`ausencia\` int NOT NULL DEFAULT '0', \`abandono\` int NOT NULL DEFAULT '0', \`transferencia\` int NOT NULL DEFAULT '0', \`deficiencia\` int NOT NULL DEFAULT '0', \`nao_participou\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`testTESID\` mediumint NULL, \`reportEditionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`report_not_evaluated\` ADD CONSTRAINT \`FK_881ba0a1a562ac8af0b20d6e345\` FOREIGN KEY (\`testTESID\`) REFERENCES \`teste\`(\`TES_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`report_not_evaluated\` ADD CONSTRAINT \`FK_6c0f04f607ec0091713d346923a\` FOREIGN KEY (\`reportEditionId\`) REFERENCES \`report_edition\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`report_not_evaluated\` DROP FOREIGN KEY \`FK_6c0f04f607ec0091713d346923a\``);
        await queryRunner.query(`ALTER TABLE \`report_not_evaluated\` DROP FOREIGN KEY \`FK_881ba0a1a562ac8af0b20d6e345\``);
        await queryRunner.query(`DROP TABLE \`report_not_evaluated\``);
    }

}
