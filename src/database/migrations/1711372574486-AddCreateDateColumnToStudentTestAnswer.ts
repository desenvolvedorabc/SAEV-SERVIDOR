import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCreateDateColumnToStudentTestAnswer1711372574486 implements MigrationInterface {
    name = 'AddCreateDateColumnToStudentTestAnswer1711372574486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste_resposta\` ADD \`ATR_DT_CRIACAO\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste_resposta\` DROP COLUMN \`ATR_DT_CRIACAO\``);
    }

}
