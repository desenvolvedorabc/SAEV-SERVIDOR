import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSchoolClassAndIndexInSchoolAbsences1700244139521 implements MigrationInterface {
    name = 'AddSchoolClassAndIndexInSchoolAbsences1700244139521'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`infrequencia\` ADD \`IFR_SCHOOL_CLASS_ID\` int NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_5d94c8c32fc216c939415eed09\` ON \`infrequencia\` (\`IFR_ANO\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_fb3cadd568917eecd9195a598f\` ON \`infrequencia\` (\`IFR_ALU_ID\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_c496cd5ac0b878ce939bea7adb\` ON \`infrequencia\` (\`IFR_SCHOOL_CLASS_ID\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_c6cff34ccc8f85c05172964024\` ON \`infrequencia\` (\`IFR_MES\`, \`IFR_ANO\`)`);
        await queryRunner.query(`ALTER TABLE \`infrequencia\` ADD CONSTRAINT \`FK_c496cd5ac0b878ce939bea7adb5\` FOREIGN KEY (\`IFR_SCHOOL_CLASS_ID\`) REFERENCES \`turma\`(\`TUR_ID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`infrequencia\` DROP FOREIGN KEY \`FK_c496cd5ac0b878ce939bea7adb5\``);
        await queryRunner.query(`DROP INDEX \`IDX_c6cff34ccc8f85c05172964024\` ON \`infrequencia\``);
        await queryRunner.query(`DROP INDEX \`IDX_c496cd5ac0b878ce939bea7adb\` ON \`infrequencia\``);
        await queryRunner.query(`DROP INDEX \`IDX_fb3cadd568917eecd9195a598f\` ON \`infrequencia\``);
        await queryRunner.query(`DROP INDEX \`IDX_5d94c8c32fc216c939415eed09\` ON \`infrequencia\``);
        await queryRunner.query(`ALTER TABLE \`infrequencia\` DROP COLUMN \`IFR_SCHOOL_CLASS_ID\``);
    }

}
