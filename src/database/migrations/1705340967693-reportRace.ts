import {MigrationInterface, QueryRunner} from "typeorm";

export class reportRace1705340967693 implements MigrationInterface {
    name = 'reportRace1705340967693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`report_race\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`countTotalStudents\` int NOT NULL DEFAULT '0', \`idStudents\` text NULL, \`countStudentsLaunched\` int NOT NULL DEFAULT '0', \`countPresentStudents\` int NOT NULL DEFAULT '0', \`totalGradesStudents\` int NOT NULL DEFAULT '0', \`fluente\` int NOT NULL DEFAULT '0', \`nao_fluente\` int NOT NULL DEFAULT '0', \`frases\` int NOT NULL DEFAULT '0', \`palavras\` int NOT NULL DEFAULT '0', \`silabas\` int NOT NULL DEFAULT '0', \`nao_leitor\` int NOT NULL DEFAULT '0', \`nao_avaliado\` int NOT NULL DEFAULT '0', \`nao_informado\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`reportSubjectId\` int NULL, \`racePELID\` mediumint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`report_race\` ADD CONSTRAINT \`FK_fcd5d3037951394df0e57489b74\` FOREIGN KEY (\`reportSubjectId\`) REFERENCES \`report_subject\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`report_race\` ADD CONSTRAINT \`FK_989e0b3c3a6a8b6811f7bd5e938\` FOREIGN KEY (\`racePELID\`) REFERENCES \`raca\`(\`PEL_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`report_race\` DROP FOREIGN KEY \`FK_989e0b3c3a6a8b6811f7bd5e938\``);
        await queryRunner.query(`ALTER TABLE \`report_race\` DROP FOREIGN KEY \`FK_fcd5d3037951394df0e57489b74\``);
        await queryRunner.query(`DROP TABLE \`report_race\``);
    }

}
