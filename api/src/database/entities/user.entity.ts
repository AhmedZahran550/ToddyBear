import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Device } from './device.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  mobileNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  age: number;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  preferredName?: string;

  @Column({ default: false })
  isMobileVerified: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];
}
