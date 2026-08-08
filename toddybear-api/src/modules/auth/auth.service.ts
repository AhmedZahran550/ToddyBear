import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
  ) {}

  async sendUserOtp(mobileNumber: string): Promise<{ message: string }> {
    await this.otpService.generateOtp(mobileNumber);
    return { message: 'OTP sent successfully' };
  }

  async verifyUserOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { mobileNumber, code } = verifyOtpDto;
    const isValid = await this.otpService.verifyOtp(mobileNumber, code);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    let user = await this.usersService.findByMobileNumber(mobileNumber);
    if (!user) {
      user = await this.usersService.create({ mobileNumber });
    }

    const payload = { sub: user.id, type: 'user' };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async employeeLogin(
    employeeLoginDto: EmployeeLoginDto,
  ): Promise<AuthResponseDto> {
    const { email, password } = employeeLoginDto;
    const employee = await this.employeesService.findByEmailWithPassword(email);
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await employee.validatePassword(password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: employee.id, type: 'employee', role: employee.role };
    const accessToken = this.jwtService.sign(payload);

    // Omit password from return object
    const { password: _, ...employeeData } = employee;

    return {
      accessToken,
      employee: employeeData,
    };
  }
}
