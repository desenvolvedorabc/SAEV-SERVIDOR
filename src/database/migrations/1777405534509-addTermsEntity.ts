import { MigrationInterface, QueryRunner } from 'typeorm'

export class addTermsEntity1777405534509 implements MigrationInterface {
  name = 'addTermsEntity1777405534509'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`termos_documento\` (\`id\` int NOT NULL AUTO_INCREMENT, \`version\` varchar(50) NOT NULL, \`url\` text NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`responsaveis\` ADD \`termsAcceptedAt\` timestamp NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`responsaveis\` DROP COLUMN \`termsAcceptedAt\``,
    )
    await queryRunner.query(`DROP TABLE \`termos_documento\``)
  }
}
