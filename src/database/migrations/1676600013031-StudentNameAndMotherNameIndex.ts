import {MigrationInterface, QueryRunner} from "typeorm";

export class StudentNameAndMotherNameIndex1676600013031 implements MigrationInterface {
    name = 'StudentNameAndMotherNameIndex1676600013031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_teste_resposta\` DROP FOREIGN KEY \`FK_97e1bbf68aa72fe61d8f6a7f978\``);
        await queryRunner.query(`CREATE INDEX \`IDX_adc57efd84fac942b1ed9f5bbf\` ON \`aluno\` (\`ALU_NOME\`, \`ALU_NOME_MAE\`)`);
        await queryRunner.query(`ALTER TABLE \`aluno_teste_resposta\` ADD CONSTRAINT \`FK_97e1bbf68aa72fe61d8f6a7f978\` FOREIGN KEY (\`ATR_ALT_ID\`) REFERENCES \`aluno_teste\`(\`ALT_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`importar_dados\` ADD CONSTRAINT \`FK_90d65463e6348c896c1cdfebb66\` FOREIGN KEY (\`dATUSUUSUID\`) REFERENCES \`usuario\`(\`USU_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`importar_dados\` DROP FOREIGN KEY \`FK_90d65463e6348c896c1cdfebb66\``);
        await queryRunner.query(`ALTER TABLE \`aluno_teste_resposta\` DROP FOREIGN KEY \`FK_97e1bbf68aa72fe61d8f6a7f978\``);
        await queryRunner.query(`DROP INDEX \`IDX_adc57efd84fac942b1ed9f5bbf\` ON \`aluno\``);
        await queryRunner.query(`ALTER TABLE \`aluno_teste_resposta\` ADD CONSTRAINT \`FK_97e1bbf68aa72fe61d8f6a7f978\` FOREIGN KEY (\`ATR_ALT_ID\`) REFERENCES \`aluno_teste\`(\`ALT_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
