import { MigrationInterface, QueryRunner } from "typeorm";

export class Fixes1786373902443 implements MigrationInterface {
    name = 'Fixes1786373902443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_f7cf242cdaff5bb5dee5a4d4e1b"`);
        await queryRunner.query(`ALTER TABLE "usage" DROP CONSTRAINT "FK_a5be21dd005724c5a708da39056"`);
        await queryRunner.query(`ALTER TABLE "alarms" DROP CONSTRAINT "FK_c78f23725662dfbbf52f5cec247"`);
        await queryRunner.query(`ALTER TABLE "chats" RENAME COLUMN "deviceId" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "alarms" RENAME COLUMN "deviceId" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "gender"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "age"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "ssid"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "wifiPassword"`);
        await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "deviceId"`);
        await queryRunner.query(`ALTER TABLE "devices" ADD "serialNumber" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "UQ_190fa9fd55b3263df273e808cd3" UNIQUE ("serialNumber")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "gender" character varying`);
        await queryRunner.query(`ALTER TABLE "devices" ALTER COLUMN "name" DROP NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."employees_role_enum" ADD VALUE 'super_admin'`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_ae8951c0a763a060593606b7e2d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD CONSTRAINT "FK_80dcfeb5d83f739b2e09a88a561" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alarms" DROP CONSTRAINT "FK_80dcfeb5d83f739b2e09a88a561"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_ae8951c0a763a060593606b7e2d"`);
        await queryRunner.query(`CREATE TYPE "public"."employees_role_enum_old" AS ENUM('admin', 'support', 'viewer')`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "role" TYPE "public"."employees_role_enum_old" USING "role"::"text"::"public"."employees_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."employees_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."employees_role_enum_old" RENAME TO "employees_role_enum"`);
        await queryRunner.query(`ALTER TABLE "devices" ALTER COLUMN "name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "UQ_190fa9fd55b3263df273e808cd3"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "serialNumber"`);
        await queryRunner.query(`ALTER TABLE "usage" ADD "deviceId" uuid`);
        await queryRunner.query(`ALTER TABLE "devices" ADD "wifiPassword" character varying`);
        await queryRunner.query(`ALTER TABLE "devices" ADD "ssid" character varying`);
        await queryRunner.query(`ALTER TABLE "devices" ADD "age" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "devices" ADD "gender" character varying NOT NULL DEFAULT 'boy'`);
        await queryRunner.query(`ALTER TABLE "alarms" RENAME COLUMN "userId" TO "deviceId"`);
        await queryRunner.query(`ALTER TABLE "chats" RENAME COLUMN "userId" TO "deviceId"`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD CONSTRAINT "FK_c78f23725662dfbbf52f5cec247" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage" ADD CONSTRAINT "FK_a5be21dd005724c5a708da39056" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_f7cf242cdaff5bb5dee5a4d4e1b" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
