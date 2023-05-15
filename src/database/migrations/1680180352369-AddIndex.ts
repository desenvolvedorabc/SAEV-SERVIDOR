import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndex1680180352369 implements MigrationInterface {
    name = 'AddIndex1680180352369'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_08a47e1d8b717cc6c0411a9703\` ON \`aluno_teste\` (\`ALT_ALU_ID\`, \`ALT_TES_ID\`, \`schoolClassTURID\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_08a47e1d8b717cc6c0411a9703\` ON \`aluno_teste\``);
    }

}
