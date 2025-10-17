import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNewIndexAbsences1718994518267 implements MigrationInterface {
  name = 'AddNewIndexAbsences1718994518267'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_77f8054731262750d5328e181d\` ON \`infrequencia\` (\`IFR_MES\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_277ec386d1e003f9ae0dc346f9\` ON \`infrequencia\` (\`IFR_MES\`, \`IFR_ANO\`, \`IFR_ALU_ID\`, \`IFR_SCHOOL_CLASS_ID\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_b474c7975a8d23c745599b0846\` ON \`turma\` (\`TUR_ANO\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_b474c7975a8d23c745599b0846\` ON \`turma\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_277ec386d1e003f9ae0dc346f9\` ON \`infrequencia\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_77f8054731262750d5328e181d\` ON \`infrequencia\``,
    )
  }
}
