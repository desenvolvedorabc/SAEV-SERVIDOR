import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexs1677806794672 implements MigrationInterface {
    name = 'AddIndexs1677806794672'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_689e581fff5ce8656d7fbc4851\` ON \`usuario\` (\`USU_DOCUMENTO\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_221e2c0a2264809410f7dcbb9c\` ON \`escola\` (\`ESC_INEP\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_32c59af46eb0a4a1b47caacdad\` ON \`municipio\` (\`MUN_COD_IBGE\`)`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_32c59af46eb0a4a1b47caacdad\` ON \`municipio\``);
        await queryRunner.query(`DROP INDEX \`IDX_221e2c0a2264809410f7dcbb9c\` ON \`escola\``);
        await queryRunner.query(`DROP INDEX \`IDX_689e581fff5ce8656d7fbc4851\` ON \`usuario\``);
    }

}
