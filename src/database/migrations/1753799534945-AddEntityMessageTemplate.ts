import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEntityMessageTemplate1753799534945
  implements MigrationInterface
{
  name = 'AddEntityMessageTemplate1753799534945'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`templates_mensagens\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`content\` longtext NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`templates_mensagens\``)
  }
}
