import { MigrationInterface, QueryRunner } from 'typeorm'

export class ChangeNameRegionalInSchool1714420589274
  implements MigrationInterface
{
  name = 'ChangeNameRegionalInSchool1714420589274'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`escola\` DROP FOREIGN KEY \`FK_a577bf4e2c96ebab20aefbbc075\``,
    )
    await queryRunner.query(
      `DROP INDEX \`IDX_6a63dcf74becceedd0cd88f542\` ON \`municipio\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` CHANGE \`municipalRegionalId\` \`regionalId\` mediumint NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` ADD CONSTRAINT \`FK_d3199f40ff7a325c8a8652e835a\` FOREIGN KEY (\`regionalId\`) REFERENCES \`regionais\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`escola\` DROP FOREIGN KEY \`FK_d3199f40ff7a325c8a8652e835a\``,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` CHANGE \`regionalId\` \`municipalRegionalId\` mediumint NULL`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_6a63dcf74becceedd0cd88f542\` ON \`municipio\` (\`singleRegionalId\`)`,
    )
    await queryRunner.query(
      `ALTER TABLE \`escola\` ADD CONSTRAINT \`FK_a577bf4e2c96ebab20aefbbc075\` FOREIGN KEY (\`municipalRegionalId\`) REFERENCES \`regionais\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
  }
}
