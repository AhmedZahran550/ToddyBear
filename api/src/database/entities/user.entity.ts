import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Device } from './device.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  mobileNumber: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];
}
