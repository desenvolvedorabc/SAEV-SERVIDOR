import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBatchOperation1780944541272 implements MigrationInterface {
  name = 'CreateBatchOperation1780944541272'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`batch_operation\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('STUDENT_DEACTIVATION', 'CLASS_DEACTIVATION') NOT NULL, \`status\` enum ('PENDING', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'PENDING', \`combinations\` json NOT NULL, \`year\` varchar(255) NULL, \`requested_by_user_id\` mediumint NULL, \`error_message\` text NULL, \`retry_count\` int NOT NULL DEFAULT '0', \`start_date\` timestamp NULL, \`end_date\` timestamp NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_batch_operation_type_status\` ON \`batch_operation\` (\`type\`, \`status\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`batch_operation\` ADD CONSTRAINT \`FK_batch_operation_requested_by_user\` FOREIGN KEY (\`requested_by_user_id\`) REFERENCES \`usuario\`(\`USU_ID\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`batch_operation\` DROP FOREIGN KEY \`FK_batch_operation_requested_by_user\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_batch_operation_type_status\` ON \`batch_operation\``,
    )
    await queryRunner.query(`DROP TABLE \`batch_operation\``)
  }
}
