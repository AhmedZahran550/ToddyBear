import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { EmployeesService } from '../../employees/employees.service';

export interface JwtPayload {
  sub: string;
  type: 'user' | 'employee';
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-jwt-key'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'user') {
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account inactive or not found');
      }
      return { ...user, type: 'user' };
    } else if (payload.type === 'employee') {
      const employee = await this.employeesService.findOne(payload.sub);
      if (!employee || !employee.isActive) {
        throw new UnauthorizedException('Employee account inactive or not found');
      }
      return { ...employee, type: 'employee', role: employee.role };
    }

    throw new UnauthorizedException('Invalid token payload');
  }
}
