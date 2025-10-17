import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddColumnStateInUsers1713795380584 implements MigrationInterface {
  name = 'AddColumnStateInUsers1713795380584'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`usuario\` ADD \`stateId\` mediumint NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`usuario\` ADD CONSTRAINT \`FK_3d9e72c32ba9491c144d92bbc15\` FOREIGN KEY (\`stateId\`) REFERENCES \`estados\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`usuario\` DROP FOREIGN KEY \`FK_3d9e72c32ba9491c144d92bbc15\``,
    )
    await queryRunner.query(`ALTER TABLE \`usuario\` DROP COLUMN \`stateId\``)
  }
}
