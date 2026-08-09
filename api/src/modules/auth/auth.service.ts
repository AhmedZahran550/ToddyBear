import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { DevicesService } from '../devices/devices.service';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserSignupDto } from './dto/user-signup.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../../database/entities/user.entity';
import { EmployeeRole } from '../../database/entities/employee.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
    private readonly devicesService: DevicesService,
    private readonly configService: ConfigService,
  ) {}

  async deviceLogin(dto: DeviceLoginDto): Promise<any> {
    const device = await this.devicesService.findByMacAddressWithUser(
      dto.macAddress,
    );

    if (!device) {
      throw new UnauthorizedException(
        `Device MAC ${dto.macAddress} is not registered in the system.`,
      );
    }

    if (!device.userId || !device.user) {
      throw new UnauthorizedException(
        `Device ${dto.macAddress} is not assigned to any user account.`,
      );
    }

    if (!device.user.isMobileVerified) {
      throw new UnauthorizedException(
        `The user (${device.user.firstName} ${device.user.lastName}) assigned to device ${dto.macAddress} has not verified their mobile number.`,
      );
    }

    if (!device.user.isActive) {
      throw new UnauthorizedException(
        `The user account (${device.user.firstName} ${device.user.lastName}) assigned to device ${dto.macAddress} is inactive.`,
      );
    }

    const userName =
      device.user.preferredName ||
      `${device.user.firstName} ${device.user.lastName}`.trim();

    const payload = {
      sub: device.id,
      type: 'device',
      macAddress: device.macAddress,
      userId: device.user.id,
      userName: userName,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      device: {
        id: device.id,
        macAddress: device.macAddress,
        name: device.name,
        gender: device.gender,
        age: device.age,
      },
      user: {
        id: device.user.id,
        firstName: device.user.firstName,
        lastName: device.user.lastName,
        preferredName: device.user.preferredName,
        mobileNumber: device.user.mobileNumber,
        isMobileVerified: device.user.isMobileVerified,
      },
    };
  }

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

    const superAdminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    const superAdminPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD');

    const isSuperAdminByEnvCreds =
      !!superAdminEmail &&
      !!superAdminPassword &&
      email.toLowerCase() === superAdminEmail.toLowerCase() &&
      password === superAdminPassword;

    let employee = await this.employeesService.findByEmailWithPassword(email);

    if (isSuperAdminByEnvCreds) {
      if (employee) {
        if (!employee.isActive) {
          throw new UnauthorizedException('Employee account is inactive');
        }
        const { password: _, ...employeeData } = employee;
        const payload = {
          sub: employee.id,
          type: 'employee',
          role: employee.role || EmployeeRole.SUPER_ADMIN,
          isSuperAdmin: true,
        };
        const accessToken = this.jwtService.sign(payload);
        return {
          accessToken,
          employee: {
            ...employeeData,
            isSuperAdmin: true,
          },
          isSuperAdmin: true,
        };
      } else {
        const virtualEmployee = {
          id: '00000000-0000-0000-0000-000000000000',
          email: superAdminEmail,
          name: 'Super Admin',
          role: EmployeeRole.SUPER_ADMIN,
          isActive: true,
          isSuperAdmin: true,
        };
        const payload = {
          sub: virtualEmployee.id,
          type: 'employee',
          role: virtualEmployee.role,
          isSuperAdmin: true,
        };
        const accessToken = this.jwtService.sign(payload);
        return {
          accessToken,
          employee: virtualEmployee,
          isSuperAdmin: true,
        };
      }
    }

    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await employee.validatePassword(password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isSuperAdmin =
      (!!superAdminEmail && employee.email.toLowerCase() === superAdminEmail.toLowerCase()) ||
      employee.role === EmployeeRole.SUPER_ADMIN;

    const payload = {
      sub: employee.id,
      type: 'employee',
      role: employee.role,
      isSuperAdmin,
    };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...employeeData } = employee;

    return {
      accessToken,
      employee: {
        ...employeeData,
        isSuperAdmin,
      },
      isSuperAdmin,
    };
  }
}

