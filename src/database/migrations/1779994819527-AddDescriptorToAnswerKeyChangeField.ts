import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDescriptorToAnswerKeyChangeField1779994819527
  implements MigrationInterface
{
  name = 'AddDescriptorToAnswerKeyChangeField1779994819527'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`answer_key_change_log\` CHANGE \`field\` \`field\` enum('RESPOSTA_CORRETA', 'ANULADA', 'DESCRITOR') NOT NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`answer_key_change_log\` CHANGE \`field\` \`field\` enum('RESPOSTA_CORRETA', 'ANULADA') NOT NULL`,
    )
  }
}
