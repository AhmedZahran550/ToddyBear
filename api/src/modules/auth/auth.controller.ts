import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('user/send-otp')
  sendUserOtp(@Body() userLoginDto: UserLoginDto) {
    return this.authService.sendUserOtp(userLoginDto.mobileNumber);
  }

  @Public()
  @Post('user/verify-otp')
  verifyUserOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyUserOtp(verifyOtpDto);
  }

  @Public()
  @Post('employee/login')
  employeeLogin(@Body() employeeLoginDto: EmployeeLoginDto) {
    return this.authService.employeeLogin(employeeLoginDto);
  }
}
