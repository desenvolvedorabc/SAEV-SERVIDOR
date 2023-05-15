import {MigrationInterface, QueryRunner} from "typeorm";

export class AddArrayNumber1680201789144 implements MigrationInterface {
    name = 'AddArrayNumber1680201789144'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`report_subject\` ADD \`idStudents\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`report_subject\` DROP COLUMN \`idStudents\``);
    }

}
