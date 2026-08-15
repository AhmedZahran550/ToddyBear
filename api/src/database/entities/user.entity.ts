import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Device } from './device.entity';
import { Alarm } from './alarm.entity';
import { Chat } from './chat.entity';
import { Usage } from './usage.entity';
import { Ringtone } from './ringtone.entity';

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
  gender?: string;

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

  @OneToMany(() => Alarm, (alarm) => alarm.user)
  alarms: Alarm[];

  @OneToMany(() => Chat, (chat) => chat.user)
  chats: Chat[];

  @OneToMany(() => Usage, (usage) => usage.user)
  usages: Usage[];

  @OneToMany(() => Ringtone, (ringtone) => ringtone.user)
  ringtones: Ringtone[];
}
