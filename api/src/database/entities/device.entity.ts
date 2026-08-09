import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ unique: true })
  macAddress: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @ManyToOne(() => User, (user) => user.devices, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;
}
