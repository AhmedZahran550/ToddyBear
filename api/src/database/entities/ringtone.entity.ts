import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Alarm } from './alarm.entity';

@Entity('ringtones')
export class Ringtone extends BaseEntity {
  @Column()
  name: string;

  @Column()
  cloudinaryPublicId: string;

  @Column()
  url: string;

  @Column({ type: 'int', default: 0 })
  fileSize: number;

  @Column({ default: 'audio/mpeg' })
  mimeType: string;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => User, (user) => user.ringtones, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  userId: string | null;

  @OneToMany(() => Alarm, (alarm) => alarm.ringtone)
  alarms: Alarm[];
}
