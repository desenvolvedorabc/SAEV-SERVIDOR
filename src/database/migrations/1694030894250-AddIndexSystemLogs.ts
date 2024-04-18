import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexSystemLogs1694030894250 implements MigrationInterface {
    name = 'AddIndexSystemLogs1694030894250'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_8255879e189354927b5cd3186b\` ON \`system_logs\` (\`createdAt\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_61975ebe20e278074b27496842\` ON \`system_logs\` (\`userUSUID\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_16969ee621b37a8dd852362e22\` ON \`system_logs\` (\`nameEntity\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_6bd967ece1dd36cda8f877beb9\` ON \`system_logs\` (\`method\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_6bd967ece1dd36cda8f877beb9\` ON \`system_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_16969ee621b37a8dd852362e22\` ON \`system_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_61975ebe20e278074b27496842\` ON \`system_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_8255879e189354927b5cd3186b\` ON \`system_logs\``);
    }

}
