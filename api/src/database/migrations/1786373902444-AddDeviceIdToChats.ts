import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceIdToChats1786373902444 implements MigrationInterface {
  name = 'AddDeviceIdToChats1786373902444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chats" ADD "deviceId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_chats_deviceId" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_chats_deviceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP COLUMN "deviceId"`,
    );
  }
}
