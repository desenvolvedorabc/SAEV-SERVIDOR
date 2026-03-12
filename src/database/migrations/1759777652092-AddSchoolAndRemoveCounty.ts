import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSchoolAndRemoveCounty1759777652092
  implements MigrationInterface
{
  name = 'AddSchoolAndRemoveCounty1759777652092'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` DROP FOREIGN KEY \`FK_77f1e2c6823584ae092a2ede7c1\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_77f1e2c6823584ae092a2ede7c\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_aa4654be2bf886963dc97181ad\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` DROP COLUMN \`countyId\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` DROP COLUMN \`typeSchool\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` ADD \`schoolId\` int NOT NULL`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_2945bfefd87fae63351db6f99e\` ON \`regras_notificacao_automatica\` (\`schoolId\`, \`ruleType\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_2e0f48a32ee79f335ec6e782d5\` ON \`regras_notificacao_automatica\` (\`schoolId\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` ADD CONSTRAINT \`FK_2e0f48a32ee79f335ec6e782d55\` FOREIGN KEY (\`schoolId\`) REFERENCES \`escola\`(\`ESC_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` DROP FOREIGN KEY \`FK_2e0f48a32ee79f335ec6e782d55\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_2e0f48a32ee79f335ec6e782d5\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_2945bfefd87fae63351db6f99e\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` DROP COLUMN \`schoolId\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` ADD \`typeSchool\` enum ('MUNICIPAL', 'ESTADUAL') NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` ADD \`countyId\` mediumint NOT NULL`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_aa4654be2bf886963dc97181ad\` ON \`regras_notificacao_automatica\` (\`countyId\`, \`ruleType\`, \`typeSchool\`)`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_77f1e2c6823584ae092a2ede7c\` ON \`regras_notificacao_automatica\` (\`countyId\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` ADD CONSTRAINT \`FK_77f1e2c6823584ae092a2ede7c1\` FOREIGN KEY (\`countyId\`) REFERENCES \`municipio\`(\`MUN_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }
}
