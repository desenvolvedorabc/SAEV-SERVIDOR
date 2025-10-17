import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSchoolTutorMessage1757593356605 implements MigrationInterface {
  name = 'AddSchoolTutorMessage1757593356605'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tutor_mensagens\` ADD \`schoolId\` int NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`templates_mensagens\` ADD \`schoolId\` int NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`tutor_mensagens\` ADD CONSTRAINT \`FK_8e775e6528f966cc175d6c1dffc\` FOREIGN KEY (\`schoolId\`) REFERENCES \`escola\`(\`ESC_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`templates_mensagens\` ADD CONSTRAINT \`FK_6e1a457195b8bcb5c14060af107\` FOREIGN KEY (\`schoolId\`) REFERENCES \`escola\`(\`ESC_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`templates_mensagens\` DROP FOREIGN KEY \`FK_6e1a457195b8bcb5c14060af107\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`tutor_mensagens\` DROP FOREIGN KEY \`FK_8e775e6528f966cc175d6c1dffc\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`templates_mensagens\` DROP COLUMN \`schoolId\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`tutor_mensagens\` DROP COLUMN \`schoolId\``,
    )
  }
}
