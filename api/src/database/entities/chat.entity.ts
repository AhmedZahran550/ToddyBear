import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Device } from './device.entity';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  OPERATOR = 'operator',
}

@Entity('chats')
@Index('USER_DEVICE_CHAT_INDEX', ['userId', 'deviceId', 'createdAt'])
export class Chat extends BaseEntity {
  @Column({ type: 'enum', enum: ChatRole })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User, (user) => user.chats, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'deviceId' })
  device?: Device;

  @Column({ nullable: true })
  deviceId?: string;
}
