import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEntityTutorMessage1753899829432 implements MigrationInterface {
  name = 'AddEntityTutorMessage1753899829432'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`tutor_mensagens\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`content\` longtext NOT NULL, \`filters\` json NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `CREATE TABLE \`envios_tutor_mensagens\` (\`id\` mediumint NOT NULL AUTO_INCREMENT, \`statusEmail\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE', \`statusWhatsapp\` enum ('PENDENTE', 'NAO_ENVIADO', 'ENTREGUE', 'ENVIADO', 'FALHOU') NOT NULL DEFAULT 'PENDENTE', \`studentId\` int NOT NULL, \`tutorMessageId\` mediumint NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` ADD CONSTRAINT \`FK_595034ab258058fd50acd4dac42\` FOREIGN KEY (\`studentId\`) REFERENCES \`aluno\`(\`ALU_ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` ADD CONSTRAINT \`FK_7e5ae03b3b285364459f37d91d0\` FOREIGN KEY (\`tutorMessageId\`) REFERENCES \`tutor_mensagens\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` DROP FOREIGN KEY \`FK_7e5ae03b3b285364459f37d91d0\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`envios_tutor_mensagens\` DROP FOREIGN KEY \`FK_595034ab258058fd50acd4dac42\``,
    )
    await queryRunner.query(`DROP TABLE \`envios_tutor_mensagens\``)
    await queryRunner.query(`DROP TABLE \`tutor_mensagens\``)
  }
}
