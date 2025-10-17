import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRoleInSubPerfil1713384353244 implements MigrationInterface {
  name = 'AddRoleInSubPerfil1713384353244'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`sub_perfil\` ADD \`role\` enum ('SAEV', 'ESTADO', 'MUNICIPIO_ESTADUAL', 'MUNICIPIO_MUNICIPAL', 'ESCOLA') NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`sub_perfil\` DROP COLUMN \`role\``)
  }
}
