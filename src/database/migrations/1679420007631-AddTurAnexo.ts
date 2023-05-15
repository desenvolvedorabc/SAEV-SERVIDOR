import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTurAnexo1679420007631 implements MigrationInterface {
    name = 'AddTurAnexo1679420007631'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`turma\` ADD \`TUR_ANEXO\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`turma\` DROP COLUMN \`TUR_ANEXO\``);
    }

}
