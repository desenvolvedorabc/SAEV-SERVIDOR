import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEntityAutomaticNotification1756747250711
  implements MigrationInterface
{
  name = 'AddEntityAutomaticNotification1756747250711'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`regras_notificacao_automatica\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`ruleType\` enum ('BAIXO_RENDIMENTO', 'EXCESSO_FALTAS', 'RESULTADO_TESTE') NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`title\` varchar(255) NOT NULL, \`content\` longtext NOT NULL, \`parameters\` json NULL, \`typeSchool\` enum ('MUNICIPAL', 'ESTADUAL') NOT NULL, \`countyId\` mediumint NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_aa4654be2bf886963dc97181ad\` (\`countyId\`, \`ruleType\`, \`typeSchool\`), INDEX \`IDX_4327f0048b90fe3560ed2e16a4\` (\`ruleType\`), INDEX \`IDX_77f1e2c6823584ae092a2ede7c\` (\`countyId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `CREATE TABLE \`historico_notificacao_automatica\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`statusEmail\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE', \`statusWhatsapp\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE', \`contextHash\` varchar(255) NOT NULL COMMENT 'Hash único para identificar contexto da notificação e evitar duplicatas', \`ruleType\` enum ('BAIXO_RENDIMENTO', 'EXCESSO_FALTAS', 'RESULTADO_TESTE') NOT NULL, \`data\` json NULL, \`studentId\` int NOT NULL, \`ruleId\` mediumint NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_d6ed17459bf4e91ddd856eb5e8\` (\`studentId\`, \`ruleType\`, \`contextHash\`), INDEX \`IDX_a50f0f41f9f83762446034c8ef\` (\`contextHash\`), INDEX \`IDX_080307fc8241bb8801edec9b21\` (\`ruleType\`), INDEX \`IDX_c7947220d514c983f9515a0af2\` (\`statusWhatsapp\`), INDEX \`IDX_133ccbe8567d348b28bb02c55b\` (\`statusEmail\`), INDEX \`IDX_2dcd0bdef4bedc7f03ed488aeb\` (\`studentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` ADD CONSTRAINT \`FK_77f1e2c6823584ae092a2ede7c1\` FOREIGN KEY (\`countyId\`) REFERENCES \`municipio\`(\`MUN_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` ADD CONSTRAINT \`FK_2dcd0bdef4bedc7f03ed488aeb9\` FOREIGN KEY (\`studentId\`) REFERENCES \`aluno\`(\`ALU_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` ADD CONSTRAINT \`FK_011b106c70a13f075ad9b0cde64\` FOREIGN KEY (\`ruleId\`) REFERENCES \`regras_notificacao_automatica\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` DROP FOREIGN KEY \`FK_011b106c70a13f075ad9b0cde64\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` DROP FOREIGN KEY \`FK_2dcd0bdef4bedc7f03ed488aeb9\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`regras_notificacao_automatica\` DROP FOREIGN KEY \`FK_77f1e2c6823584ae092a2ede7c1\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_2dcd0bdef4bedc7f03ed488aeb\` ON \`historico_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_133ccbe8567d348b28bb02c55b\` ON \`historico_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_c7947220d514c983f9515a0af2\` ON \`historico_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_080307fc8241bb8801edec9b21\` ON \`historico_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_a50f0f41f9f83762446034c8ef\` ON \`historico_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_d6ed17459bf4e91ddd856eb5e8\` ON \`historico_notificacao_automatica\``,
    )
    await queryRunner.query(`DROP TABLE \`historico_notificacao_automatica\``)
    await queryRunner.query(
      `DROP INDEX \`IDX_77f1e2c6823584ae092a2ede7c\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_4327f0048b90fe3560ed2e16a4\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_aa4654be2bf886963dc97181ad\` ON \`regras_notificacao_automatica\``,
    )
    await queryRunner.query(`DROP TABLE \`regras_notificacao_automatica\``)
  }
}
