import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRingtonesAndAlarmFields1786818882917 implements MigrationInterface {
    name = 'AddRingtonesAndAlarmFields1786818882917'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ringtones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "name" character varying NOT NULL, "cloudinaryPublicId" character varying NOT NULL, "url" character varying NOT NULL, "fileSize" integer NOT NULL DEFAULT '0', "mimeType" character varying NOT NULL DEFAULT 'audio/mpeg', "isDefault" boolean NOT NULL DEFAULT false, "userId" uuid, CONSTRAINT "PK_8bf4572208eef04b970ed605924" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD "ringtoneId" uuid`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD "deviceId" uuid`);
        await queryRunner.query(`ALTER TABLE "ringtones" ADD CONSTRAINT "FK_f6d78ec7e7586ed506f4b968f6a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD CONSTRAINT "FK_67c8aade1cb4fe661a0c337fc35" FOREIGN KEY ("ringtoneId") REFERENCES "ringtones"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD CONSTRAINT "FK_c78f23725662dfbbf52f5cec247" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alarms" DROP CONSTRAINT "FK_c78f23725662dfbbf52f5cec247"`);
        await queryRunner.query(`ALTER TABLE "alarms" DROP CONSTRAINT "FK_67c8aade1cb4fe661a0c337fc35"`);
        await queryRunner.query(`ALTER TABLE "ringtones" DROP CONSTRAINT "FK_f6d78ec7e7586ed506f4b968f6a"`);
        await queryRunner.query(`ALTER TABLE "alarms" DROP COLUMN "deviceId"`);
        await queryRunner.query(`ALTER TABLE "alarms" DROP COLUMN "ringtoneId"`);
        await queryRunner.query(`DROP TABLE "ringtones"`);
    }

}
