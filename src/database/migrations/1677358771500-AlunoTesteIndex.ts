import {MigrationInterface, QueryRunner} from "typeorm";

export class AlunoTesteIndex1677358771500 implements MigrationInterface {
    name = 'AlunoTesteIndex1677358771500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_54824f3ca751d209a9c1da9b40\` ON \`aluno_teste\` (\`ALT_ALU_ID\`, \`ALT_TES_ID\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_54824f3ca751d209a9c1da9b40\` ON \`aluno_teste\``);
    }

}
