import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAnswerKeyChangeLogAndExtendJob1779820522586
  implements MigrationInterface
{
  name = 'CreateAnswerKeyChangeLogAndExtendJob1779820522586'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`answer_key_change_log\` (\`id\` int NOT NULL AUTO_INCREMENT, \`test_template_id\` mediumint NOT NULL, \`field\` enum ('RESPOSTA_CORRETA', 'ANULADA') NOT NULL, \`previousValue\` varchar(255) NULL, \`newValue\` varchar(255) NOT NULL, \`changed_by_user_id\` mediumint NULL, \`reprocessStatus\` enum ('PENDING', 'DISPATCHED', 'DONE', 'FAILED') NOT NULL DEFAULT 'PENDING', \`dispatchedAt\` timestamp NULL, \`errorMessage\` text NULL, \`changedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` ADD \`status\` enum ('PENDING', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'PENDING'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` ADD \`errorMessage\` text NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` ADD \`retryCount\` int NOT NULL DEFAULT '0'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` ADD \`triggered_by_change_log_id\` int NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` CHANGE \`jobType\` \`jobType\` enum ('ReportEditionSchoolClass', 'ReportSubjectSchool', 'ReportSubjectCounty', 'ReportSubjectEdition', 'ReportDescriptorsSchool', 'ReportDescriptorsCounty', 'ReportDescriptorsEdition', 'JobFull', 'ReprocessAnswerKey') NOT NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_aklc_status_changedAt\` ON \`answer_key_change_log\` (\`reprocessStatus\`, \`changedAt\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_aklc_test_template_id\` ON \`answer_key_change_log\` (\`test_template_id\`, \`reprocessStatus\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_job_status_type\` ON \`job\` (\`status\`, \`jobType\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_job_assessment_county\` ON \`job\` (\`jobType\`, \`assessmentId\`, \`countyId\`, \`status\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`answer_key_change_log\` ADD CONSTRAINT \`FK_d3674bdb957ece16c9d79b53b7a\` FOREIGN KEY (\`test_template_id\`) REFERENCES \`teste_gabarito\`(\`TEG_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`answer_key_change_log\` ADD CONSTRAINT \`FK_5c44453fef1716527e5738a9d5c\` FOREIGN KEY (\`changed_by_user_id\`) REFERENCES \`usuario\`(\`USU_ID\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` ADD CONSTRAINT \`FK_3f54e34428b6e50d73c8c22724b\` FOREIGN KEY (\`triggered_by_change_log_id\`) REFERENCES \`answer_key_change_log\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`job\` DROP FOREIGN KEY \`FK_3f54e34428b6e50d73c8c22724b\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`answer_key_change_log\` DROP FOREIGN KEY \`FK_5c44453fef1716527e5738a9d5c\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`answer_key_change_log\` DROP FOREIGN KEY \`FK_d3674bdb957ece16c9d79b53b7a\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_job_assessment_county\` ON \`job\``,
    )
    await queryRunner.query(`DROP INDEX \`IDX_job_status_type\` ON \`job\``)
    await queryRunner.query(
      `DROP INDEX \`IDX_aklc_test_template_id\` ON \`answer_key_change_log\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_aklc_status_changedAt\` ON \`answer_key_change_log\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` CHANGE \`jobType\` \`jobType\` enum ('ReportEditionSchoolClass', 'ReportSubjectSchool', 'ReportSubjectCounty', 'ReportSubjectEdition', 'ReportDescriptorsSchool', 'ReportDescriptorsCounty', 'ReportDescriptorsEdition', 'JobFull') NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`job\` DROP COLUMN \`triggered_by_change_log_id\``,
    )
    await queryRunner.query(`ALTER TABLE \`job\` DROP COLUMN \`retryCount\``)
    await queryRunner.query(`ALTER TABLE \`job\` DROP COLUMN \`errorMessage\``)
    await queryRunner.query(`ALTER TABLE \`job\` DROP COLUMN \`status\``)
    await queryRunner.query(`DROP TABLE \`answer_key_change_log\``)
  }
}
