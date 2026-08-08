import { MigrationInterface, QueryRunner } from "typeorm";

export class First1786204720022 implements MigrationInterface {
    name = 'First1786204720022'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" character varying, "method" character varying NOT NULL, "url" character varying NOT NULL, "ip" character varying, "userId" character varying, "statusCode" integer NOT NULL, "responseTime" integer NOT NULL, "requestId" character varying, "requestBody" jsonb, "error" jsonb, CONSTRAINT "PK_350604cbdf991d5930d9e618fbd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "log"`);
    }

}
