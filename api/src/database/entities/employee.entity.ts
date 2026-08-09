import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as argon2 from 'argon2';
import { BaseEntity } from './base.entity';

export enum EmployeeRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUPPORT = 'support',
  VIEWER = 'viewer',
}

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: EmployeeRole, default: EmployeeRole.VIEWER })
  role: EmployeeRole;

  @Column({ default: true })
  isActive: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password && !this.password.startsWith('$argon2')) {
      this.password = await argon2.hash(this.password);
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return argon2.verify(this.password, plainPassword);
  }
}
