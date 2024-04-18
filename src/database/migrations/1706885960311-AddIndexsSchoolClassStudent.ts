import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexsSchoolClassStudent1706885960311 implements MigrationInterface {
    name = 'AddIndexsSchoolClassStudent1706885960311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_ef19c5df8f66a23b68e58aa489\` ON \`turma_aluno\` (\`schoolClassTURID\`, \`studentALUID\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_0c05dfc9ec8198bbb35e19f993\` ON \`turma_aluno\` (\`studentALUID\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_817daa1f3ff3d5eac755fdbf53\` ON \`turma_aluno\` (\`schoolClassTURID\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_817daa1f3ff3d5eac755fdbf53\` ON \`turma_aluno\``);
        await queryRunner.query(`DROP INDEX \`IDX_0c05dfc9ec8198bbb35e19f993\` ON \`turma_aluno\``);
        await queryRunner.query(`DROP INDEX \`IDX_ef19c5df8f66a23b68e58aa489\` ON \`turma_aluno\``);
    }

}
