import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('otps')
export class Otp extends BaseEntity {
  @Index()
  @Column()
  mobileNumber: string;

  @Column()
  code: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;
}
