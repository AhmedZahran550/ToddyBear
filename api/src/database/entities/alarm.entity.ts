import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Ringtone } from './ringtone.entity';
import { Device } from './device.entity';

@Entity('alarms')
export class Alarm extends BaseEntity {
  @Column()
  time: string;

  @Column({ nullable: true })
  label: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'date', nullable: true })
  lastTriggeredDate: string;

  @ManyToOne(() => User, (user) => user.alarms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Ringtone, (ringtone) => ringtone.alarms, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'ringtoneId' })
  ringtone: Ringtone | null;

  @Column({ nullable: true })
  ringtoneId: string | null;

  @ManyToOne(() => Device, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'deviceId' })
  device: Device | null;

  @Column({ nullable: true })
  deviceId: string | null;
}
