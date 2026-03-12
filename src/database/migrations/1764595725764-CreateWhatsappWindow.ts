import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWhatsappWindow1764595725764 implements MigrationInterface {
  name = 'CreateWhatsappWindow1764595725764'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`whatsapp_janelas_conversa\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`studentId\` int NOT NULL, \`status\` enum ('PENDING_OPT_IN', 'ACTIVE', 'EXPIRED', 'OPTED_OUT') NOT NULL DEFAULT 'PENDING_OPT_IN', \`phoneNumber\` varchar(20) NOT NULL, \`expiresAt\` datetime NULL, \`messageSid\` varchar(100) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_b0fe992fe8bf93dde4ebcd8ad9\` (\`expiresAt\`), INDEX \`IDX_8e44558adfbf8e593213e2c38d\` (\`studentId\`, \`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` CHANGE \`statusEmail\` \`statusEmail\` enum ('PENDENTE', 'PENDENTE_JANELA', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU', 'USUARIO_RECUSOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` CHANGE \`statusWhatsapp\` \`statusWhatsapp\` enum ('PENDENTE', 'PENDENTE_JANELA', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU', 'USUARIO_RECUSOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` CHANGE \`statusEmail\` \`statusEmail\` enum ('PENDENTE', 'PENDENTE_JANELA', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU', 'USUARIO_RECUSOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` CHANGE \`statusWhatsapp\` \`statusWhatsapp\` enum ('PENDENTE', 'PENDENTE_JANELA', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU', 'USUARIO_RECUSOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `CREATE INDEX \`IDX_41eaeef7dd8098bc51a9342572\` ON \`envios_tutor_mensagens\` (\`studentId\`, \`statusWhatsapp\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`whatsapp_janelas_conversa\` ADD CONSTRAINT \`FK_4a5a0580f93742d34fd658a3c4f\` FOREIGN KEY (\`studentId\`) REFERENCES \`aluno\`(\`ALU_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`whatsapp_janelas_conversa\` DROP FOREIGN KEY \`FK_4a5a0580f93742d34fd658a3c4f\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_41eaeef7dd8098bc51a9342572\` ON \`envios_tutor_mensagens\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` CHANGE \`statusWhatsapp\` \`statusWhatsapp\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`historico_notificacao_automatica\` CHANGE \`statusEmail\` \`statusEmail\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` CHANGE \`statusWhatsapp\` \`statusWhatsapp\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` CHANGE \`statusEmail\` \`statusEmail\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE'`,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_8e44558adfbf8e593213e2c38d\` ON \`whatsapp_janelas_conversa\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_b0fe992fe8bf93dde4ebcd8ad9\` ON \`whatsapp_janelas_conversa\``,
    )
    await queryRunner.query(`DROP TABLE \`whatsapp_janelas_conversa\``)
  }
}
