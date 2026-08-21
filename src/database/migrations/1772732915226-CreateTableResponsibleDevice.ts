import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTableResponsibleDevice1772732915226
  implements MigrationInterface
{
  name = 'CreateTableResponsibleDevice1772732915226'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`dispositivos_responsavel\` (\`id\` int NOT NULL AUTO_INCREMENT, \`responsibleId\` int NOT NULL, \`pushToken\` varchar(255) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_f500c2d3a28918e5720612abff\` (\`responsibleId\`, \`active\`), UNIQUE INDEX \`IDX_8e23d36362a451c2a79698f13e\` (\`pushToken\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`dispositivos_responsavel\` ADD CONSTRAINT \`FK_ab4e92af00579594582b2303097\` FOREIGN KEY (\`responsibleId\`) REFERENCES \`responsaveis\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`dispositivos_responsavel\` DROP FOREIGN KEY \`FK_ab4e92af00579594582b2303097\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_8e23d36362a451c2a79698f13e\` ON \`dispositivos_responsavel\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_f500c2d3a28918e5720612abff\` ON \`dispositivos_responsavel\``,
    )
    await queryRunner.query(`DROP TABLE \`dispositivos_responsavel\``)
  }
}
