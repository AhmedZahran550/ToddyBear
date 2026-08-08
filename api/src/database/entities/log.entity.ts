import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class Log extends BaseEntity {
  @Column()
  method!: string;

  @Column()
  url!: string;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column()
  statusCode!: number;

  @Column()
  responseTime!: number; // in milliseconds

  @Column({ nullable: true })
  requestId?: string;

  @Column({ type: 'jsonb', nullable: true })
  requestBody?: any;

  @Column({ type: 'jsonb', nullable: true })
  error?: any;
}
