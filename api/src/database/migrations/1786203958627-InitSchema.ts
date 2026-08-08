import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1786203958627 implements MigrationInterface {
    name = 'InitSchema1786203958627'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "mobileNumber" character varying NOT NULL, "name" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_61dc14c8c49c187f5d08047c985" UNIQUE ("mobileNumber"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."chats_role_enum" AS ENUM('user', 'assistant', 'operator')`);
        await queryRunner.query(`CREATE TABLE "chats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "role" "public"."chats_role_enum" NOT NULL, "content" text NOT NULL, "deviceId" uuid NOT NULL, CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "usage" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "promptTokens" integer NOT NULL DEFAULT '0', "completionTokens" integer NOT NULL DEFAULT '0', "totalTokens" integer NOT NULL DEFAULT '0', "model" character varying, "deviceId" uuid, "userId" uuid, CONSTRAINT "PK_7bc33e71ab6c3b71eac72950b44" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "macAddress" character varying NOT NULL, "name" character varying NOT NULL, "gender" character varying NOT NULL DEFAULT 'boy', "age" character varying NOT NULL, "ssid" character varying, "wifiPassword" character varying, "isOnline" boolean NOT NULL DEFAULT false, "lastSeenAt" TIMESTAMP, "userId" uuid, CONSTRAINT "UQ_b53f9f3cf7a54152cbb70dd75cd" UNIQUE ("macAddress"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "alarms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "time" character varying NOT NULL, "label" character varying, "enabled" boolean NOT NULL DEFAULT true, "lastTriggeredDate" date, "deviceId" uuid NOT NULL, CONSTRAINT "PK_b776da486fb19d38b4f7777a6da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."employees_role_enum" AS ENUM('admin', 'support', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."employees_role_enum" NOT NULL DEFAULT 'viewer', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "method" character varying NOT NULL, "url" character varying NOT NULL, "statusCode" integer NOT NULL, "ip" character varying, "requestBody" text, "responseBody" text, "errorMessage" text, "durationMs" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "mobileNumber" character varying NOT NULL, "code" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "usedAt" TIMESTAMP, CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7e0331b6a2b4d8a0c9b1936702" ON "otps"  ("mobileNumber") `);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_f7cf242cdaff5bb5dee5a4d4e1b" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage" ADD CONSTRAINT "FK_a5be21dd005724c5a708da39056" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage" ADD CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alarms" ADD CONSTRAINT "FK_c78f23725662dfbbf52f5cec247" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alarms" DROP CONSTRAINT "FK_c78f23725662dfbbf52f5cec247"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6"`);
        await queryRunner.query(`ALTER TABLE "usage" DROP CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6"`);
        await queryRunner.query(`ALTER TABLE "usage" DROP CONSTRAINT "FK_a5be21dd005724c5a708da39056"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_f7cf242cdaff5bb5dee5a4d4e1b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e0331b6a2b4d8a0c9b1936702"`);
        await queryRunner.query(`DROP TABLE "otps"`);
        await queryRunner.query(`DROP TABLE "logs"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TYPE "public"."employees_role_enum"`);
        await queryRunner.query(`DROP TABLE "alarms"`);
        await queryRunner.query(`DROP TABLE "devices"`);
        await queryRunner.query(`DROP TABLE "usage"`);
        await queryRunner.query(`DROP TABLE "chats"`);
        await queryRunner.query(`DROP TYPE "public"."chats_role_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
