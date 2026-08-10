import { MigrationInterface, QueryRunner } from "typeorm";

export class Indexes1786380260454 implements MigrationInterface {
    name = 'Indexes1786380260454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_chats_deviceId"`);
        await queryRunner.query(`CREATE INDEX "USER_DEVICE_CHAT_INDEX" ON "chats"  ("userId", "deviceId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "USER_USAGE_INDEX" ON "usage"  ("userId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_f7cf242cdaff5bb5dee5a4d4e1b" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_f7cf242cdaff5bb5dee5a4d4e1b"`);
        await queryRunner.query(`DROP INDEX "public"."USER_USAGE_INDEX"`);
        await queryRunner.query(`DROP INDEX "public"."USER_DEVICE_CHAT_INDEX"`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_chats_deviceId" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
