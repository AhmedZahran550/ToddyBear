import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAge1786208246074 implements MigrationInterface {
    name = 'AddUserAge1786208246074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "age" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "age"`);
    }

}
