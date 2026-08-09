import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('usage')
export class Usage extends BaseEntity {
  @Column({ default: 0 })
  promptTokens: number;

  @Column({ default: 0 })
  completionTokens: number;

  @Column({ default: 0 })
  totalTokens: number;

  @Column({ nullable: true })
  model: string;

  @ManyToOne(() => User, (user) => user.usages, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;
}
