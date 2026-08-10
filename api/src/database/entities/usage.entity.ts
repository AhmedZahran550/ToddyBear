import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('usage')
@Index('USER_USAGE_INDEX', ['userId', 'createdAt'])
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
