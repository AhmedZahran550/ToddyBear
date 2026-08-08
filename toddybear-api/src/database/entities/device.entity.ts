import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Alarm } from './alarm.entity';
import { Chat } from './chat.entity';
import { Usage } from './usage.entity';

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ unique: true })
  macAddress: string;

  @Column()
  name: string;

  @Column({ default: 'boy' })
  gender: string;

  @Column()
  age: string;

  @Column({ nullable: true })
  ssid: string;

  @Column({ nullable: true })
  wifiPassword: string;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @OneToMany(() => Alarm, (alarm) => alarm.device)
  alarms: Alarm[];

  @OneToMany(() => Chat, (chat) => chat.device)
  chats: Chat[];

  @OneToMany(() => Usage, (usage) => usage.device)
  usages: Usage[];
}
