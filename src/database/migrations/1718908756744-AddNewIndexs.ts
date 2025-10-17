import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNewIndexs1718908756744 implements MigrationInterface {
  name = 'AddNewIndexs1718908756744'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_e82de00c586bad5bd0b51e345b\` ON \`regionais\` (\`countyId\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_e41d1e7bf62088870f72ebb20c\` ON \`regionais\` (\`stateId\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_0c9a375d25fab197829ff73552\` ON \`regionais\` (\`type\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_d3199f40ff7a325c8a8652e835\` ON \`escola\` (\`regionalId\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_9af7c1ecf0698b1bb8e943e5a5\` ON \`escola\` (\`ESC_TIPO\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_61843bc2693672f68189db781d\` ON \`aluno\` (\`ALU_PEL_ID\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_7b0054be3e57ff07b744778660\` ON \`aluno\` (\`ALU_TUR_ID\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_9c96b7c9eacb11337a3207f9e5\` ON \`aluno\` (\`ALU_SER_ID\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_9525b143a8fee423cdf29445c6\` ON \`municipio\` (\`MUN_PARCEIRO_EPV\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_87f88a74ce9c80e03a8d0c5c68\` ON \`municipio\` (\`stateRegionalId\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_a0b09a5190f1f5ee6e97c81a4e\` ON \`turma\` (\`TUR_SER_ID\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_88bc42f4dda9562c560ca898c2\` ON \`turma\` (\`TUR_MUN_ID\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_88bc42f4dda9562c560ca898c2\` ON \`turma\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_a0b09a5190f1f5ee6e97c81a4e\` ON \`turma\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_87f88a74ce9c80e03a8d0c5c68\` ON \`municipio\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_9525b143a8fee423cdf29445c6\` ON \`municipio\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_9c96b7c9eacb11337a3207f9e5\` ON \`aluno\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_7b0054be3e57ff07b744778660\` ON \`aluno\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_61843bc2693672f68189db781d\` ON \`aluno\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_9af7c1ecf0698b1bb8e943e5a5\` ON \`escola\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_d3199f40ff7a325c8a8652e835\` ON \`escola\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_0c9a375d25fab197829ff73552\` ON \`regionais\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_e41d1e7bf62088870f72ebb20c\` ON \`regionais\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_e82de00c586bad5bd0b51e345b\` ON \`regionais\``,
    )
  }
}
