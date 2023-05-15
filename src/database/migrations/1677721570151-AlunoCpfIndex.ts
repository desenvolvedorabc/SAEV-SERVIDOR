import {MigrationInterface, QueryRunner} from "typeorm";

export class AlunoCpfIndex1677721570151 implements MigrationInterface {
    name = 'AlunoCpfIndex1677721570151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_7740a81b0aa01c34b65ddb0285\` ON \`aluno\` (\`ALU_CPF\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_7740a81b0aa01c34b65ddb0285\` ON \`aluno\``);
    }

}
