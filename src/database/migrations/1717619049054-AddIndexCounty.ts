import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIndexCounty1717619049054 implements MigrationInterface {
  name = 'AddIndexCounty1717619049054'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_6fd03e3b9f66ddbd14440f891e\` ON \`municipio\` (\`MUN_COMPARTILHAR_DADOS\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_f2a75214ea7adf842fc2bd880f\` ON \`municipio\` (\`stateId\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_f2a75214ea7adf842fc2bd880f\` ON \`municipio\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_6fd03e3b9f66ddbd14440f891e\` ON \`municipio\``,
    )
  }
}
