import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column()
  displayName!: string;

  @Column()
  email!: string;

  @Column({ length: 44, unique: true })
  token!: string;

  @Column({ unique: true })
  chatId!: number;

  @Column({ unique: true })
  chatUserName!: string;
}
