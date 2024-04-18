import {MigrationInterface, QueryRunner} from "typeorm";

export class AddColumnEscIntegralInSchool1707239317562 implements MigrationInterface {
    name = 'AddColumnEscIntegralInSchool1707239317562'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`escola\` ADD \`ESC_INTEGRAL\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`escola\` DROP COLUMN \`ESC_INTEGRAL\``);
    }

}
