import {MigrationInterface, QueryRunner} from "typeorm";

export class AddColumnTipoDeficiencia1709652285632 implements MigrationInterface {
    name = 'AddColumnTipoDeficiencia1709652285632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`aluno_alu_deficiencias_pcd\` (\`alunoALUID\` int NOT NULL, \`pcdPCDID\` mediumint NOT NULL, INDEX \`IDX_5cd4db8cd04a728212449516e5\` (\`alunoALUID\`), INDEX \`IDX_ae64cad71686ab30f92aaeb9b2\` (\`pcdPCDID\`), PRIMARY KEY (\`alunoALUID\`, \`pcdPCDID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`aluno\` ADD \`ALU_DEFICIENCIA_BY_IMPORT\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`aluno_alu_deficiencias_pcd\` ADD CONSTRAINT \`FK_5cd4db8cd04a728212449516e52\` FOREIGN KEY (\`alunoALUID\`) REFERENCES \`aluno\`(\`ALU_ID\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`aluno_alu_deficiencias_pcd\` ADD CONSTRAINT \`FK_ae64cad71686ab30f92aaeb9b2b\` FOREIGN KEY (\`pcdPCDID\`) REFERENCES \`pcd\`(\`PCD_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`aluno_alu_deficiencias_pcd\` DROP FOREIGN KEY \`FK_ae64cad71686ab30f92aaeb9b2b\``);
        await queryRunner.query(`ALTER TABLE \`aluno_alu_deficiencias_pcd\` DROP FOREIGN KEY \`FK_5cd4db8cd04a728212449516e52\``);
        await queryRunner.query(`ALTER TABLE \`aluno\` DROP COLUMN \`ALU_DEFICIENCIA_BY_IMPORT\``);
        await queryRunner.query(`DROP INDEX \`IDX_ae64cad71686ab30f92aaeb9b2\` ON \`aluno_alu_deficiencias_pcd\``);
        await queryRunner.query(`DROP INDEX \`IDX_5cd4db8cd04a728212449516e5\` ON \`aluno_alu_deficiencias_pcd\``);
        await queryRunner.query(`DROP TABLE \`aluno_alu_deficiencias_pcd\``);
    }

}
