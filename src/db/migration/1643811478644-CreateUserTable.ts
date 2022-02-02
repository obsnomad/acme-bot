import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateUserTable1643811478644 implements MigrationInterface {
    name = 'CreateUserTable1643811478644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "displayName" varchar NOT NULL, "email" varchar NOT NULL, "token" varchar(44) NOT NULL, "chatId" integer NOT NULL, "chatUserName" varchar NOT NULL, CONSTRAINT "UQ_065d4d8f3b5adb4a08841eae3c8" UNIQUE ("name"), CONSTRAINT "UQ_a854e557b1b14814750c7c7b0c9" UNIQUE ("token"), CONSTRAINT "UQ_1cfa1784ac9e67d4be782f4e5b8" UNIQUE ("chatId"), CONSTRAINT "UQ_1e27356ff56f638d8942ebf23eb" UNIQUE ("chatUserName"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
