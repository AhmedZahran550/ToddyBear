import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserSignupDto } from './dto/user-signup.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
  ) {}

  async signupUser(userSignupDto: UserSignupDto): Promise<User> {
    const existingUser = await this.usersService.findByMobileNumber(
      userSignupDto.mobileNumber,
    );

    if (existingUser) {
      if (existingUser.isMobileVerified) {
        throw new ConflictException(
          'Mobile number is already registered and verified',
        );
      }
      // Delete old unverified record before recreating
      await this.usersService.deleteUserEntity(existingUser);
    }

    return this.usersService.create({
      firstName: userSignupDto.firstName,
      lastName: userSignupDto.lastName,
      age: userSignupDto.age,
      mobileNumber: userSignupDto.mobileNumber,
      email: userSignupDto.email,
      preferredName: userSignupDto.preferredName,
      isMobileVerified: false,
      isEmailVerified: false,
    });
  }

  async sendUserOtp(mobileNumber: string): Promise<{ message: string }> {
    const user = await this.usersService.findByMobileNumber(mobileNumber);
    if (!user) {
      throw new NotFoundException(
        'Mobile number not registered. Please sign up first.',
      );
    }

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
      throw new NotFoundException('User not found. Please sign up first.');
    }

    if (!user.isMobileVerified) {
      user = await this.usersService.update(user.id, {
        isMobileVerified: true,
      });
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
