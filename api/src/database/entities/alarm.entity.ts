import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

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
}
