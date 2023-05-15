import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSchoolClass1680104926713 implements MigrationInterface {
    name = 'AddSchoolClass1680104926713'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste\` ADD \`schoolClassTURID\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`aluno_teste\` ADD CONSTRAINT \`FK_e154a5a4ab413631ae502a4af83\` FOREIGN KEY (\`schoolClassTURID\`) REFERENCES \`turma\`(\`TUR_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste\` DROP FOREIGN KEY \`FK_e154a5a4ab413631ae502a4af83\``);
        await queryRunner.query(`ALTER TABLE \`aluno_teste\` DROP COLUMN \`schoolClassTURID\``);
       
    }

}
