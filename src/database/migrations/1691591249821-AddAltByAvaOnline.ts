import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAltByAvaOnline1691591249821 implements MigrationInterface {
    name = 'AddAltByAvaOnline1691591249821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste\` ADD \`ALT_BY_AVA_ONLINE\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste\` DROP COLUMN \`ALT_BY_AVA_ONLINE\``);
    }

}
