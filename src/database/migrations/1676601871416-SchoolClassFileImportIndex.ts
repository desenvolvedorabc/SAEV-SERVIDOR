import {MigrationInterface, QueryRunner} from "typeorm";

export class SchoolClassFileImportIndex1676601871416 implements MigrationInterface {
    name = 'SchoolClassFileImportIndex1676601871416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`turma\` CHANGE COLUMN \`TUR_ANO\` \`TUR_ANO\` varchar(4) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`turma\` CHANGE COLUMN \`TUR_PERIODO\` \`TUR_PERIODO\` varchar(16) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`turma\` CHANGE COLUMN \`TUR_TIPO\` \`TUR_TIPO\` varchar(16) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_f36a2356868684cdf4ba7baf39\` ON \`turma\` (\`TUR_ESC_ID\`, \`TUR_SER_ID\`, \`TUR_PERIODO\`, \`TUR_TIPO\`, \`TUR_NOME\`, \`TUR_ANO\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_f36a2356868684cdf4ba7baf39\` ON \`turma\``);
        await queryRunner.query(`ALTER TABLE \`turma\` CHANGE COLUMN \`TUR_TIPO\` \`TUR_TIPO\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`turma\` CHANGE COLUMN \`TUR_PERIODO\` \`TUR_PERIODO\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`turma\` CHANGE COLUMN \`TUR_ANO\` \`TUR_ANO\` varchar(255) NOT NULL`);
    }

}
