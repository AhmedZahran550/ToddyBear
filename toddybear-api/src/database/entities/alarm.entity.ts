import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
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

  @ManyToOne(() => Device, (device) => device.alarms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column()
  deviceId: string;
}
