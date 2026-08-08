import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Device } from './device.entity';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  OPERATOR = 'operator',
}

@Entity('chats')
export class Chat extends BaseEntity {
  @Column({ type: 'enum', enum: ChatRole })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Device, (device) => device.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column()
  deviceId: string;
}
