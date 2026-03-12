import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateIndexWindow1764789622246 implements MigrationInterface {
  name = 'CreateIndexWindow1764789622246'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_9fc43e2b70ac1a3c52d9b7e68b\` ON \`whatsapp_janelas_conversa\` (\`studentId\`, \`status\`, \`phoneNumber\`)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_9fc43e2b70ac1a3c52d9b7e68b\` ON \`whatsapp_janelas_conversa\``,
    )
  }
}
