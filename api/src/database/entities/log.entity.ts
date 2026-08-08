import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('logs')
export class Log extends BaseEntity {
  @Column()
  method: string;

  @Column()
  url: string;

  @Column()
  statusCode: number;

  @Column({ nullable: true })
  ip?: string;

  @Column({ type: 'text', nullable: true })
  requestBody?: string | null;

  @Column({ type: 'text', nullable: true })
  responseBody?: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ default: 0 })
  durationMs: number;
}
