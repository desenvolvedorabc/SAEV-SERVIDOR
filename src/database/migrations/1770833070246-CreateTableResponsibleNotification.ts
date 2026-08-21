import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTableResponsibleNotification1770833070246
  implements MigrationInterface
{
  name = 'CreateTableResponsibleNotification1770833070246'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`notificacoes_responsavel\` (\`id\` int NOT NULL AUTO_INCREMENT, \`responsibleId\` int NOT NULL, \`studentId\` int NOT NULL, \`type\` enum ('COMUNICACAO', 'DESEMPENHO') NOT NULL, \`subtype\` enum ('FALTAS', 'RESULTADOS', 'RENDIMENTO') NULL, \`title\` varchar(500) NOT NULL, \`content\` longtext NOT NULL, \`tutorMessageId\` mediumint NULL, \`automaticNotificationSendId\` mediumint NULL, \`readAt\` timestamp NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_cc4c7f1853ce53149294ec27c6\` (\`responsibleId\`, \`type\`, \`createdAt\`), INDEX \`IDX_4e666f2b7e677f868e2add042d\` (\`responsibleId\`, \`readAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` ADD \`statusInApp\` enum ('PENDENTE', 'PENDENTE_JANELA', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU', 'USUARIO_RECUSOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` ADD \`statusInApp\` enum ('PENDENTE', 'PENDENTE_JANELA', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU', 'USUARIO_RECUSOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` ADD \`MUN_MENSAGEM_IN_APP_ATIVO\` tinyint NOT NULL DEFAULT 0`,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` ADD CONSTRAINT \`FK_3e514a659c3e1b0ee344942bbe1\` FOREIGN KEY (\`responsibleId\`) REFERENCES \`responsaveis\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` ADD CONSTRAINT \`FK_5f44500ff280b21dfa2e661435d\` FOREIGN KEY (\`studentId\`) REFERENCES \`aluno\`(\`ALU_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` ADD CONSTRAINT \`FK_61b96e71a252748286f178f7430\` FOREIGN KEY (\`tutorMessageId\`) REFERENCES \`tutor_mensagens\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` ADD CONSTRAINT \`FK_b6bad0512b2cd7e187d8901eed9\` FOREIGN KEY (\`automaticNotificationSendId\`) REFERENCES \`historico_notificacao_automatica\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` DROP FOREIGN KEY \`FK_b6bad0512b2cd7e187d8901eed9\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` DROP FOREIGN KEY \`FK_61b96e71a252748286f178f7430\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` DROP FOREIGN KEY \`FK_5f44500ff280b21dfa2e661435d\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`notificacoes_responsavel\` DROP FOREIGN KEY \`FK_3e514a659c3e1b0ee344942bbe1\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`municipio\` DROP COLUMN \`MUN_MENSAGEM_IN_APP_ATIVO\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` DROP COLUMN \`statusInApp\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` DROP COLUMN \`statusInApp\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_4e666f2b7e677f868e2add042d\` ON \`notificacoes_responsavel\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_cc4c7f1853ce53149294ec27c6\` ON \`notificacoes_responsavel\``,
    )
    await queryRunner.query(`DROP TABLE \`notificacoes_responsavel\``)
  }
}
