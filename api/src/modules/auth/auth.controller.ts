import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';
import { UserSignupDto } from './dto/user-signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiAuthDocs,
  ApiDeviceLoginDocs,
  ApiUserSignupDocs,
  ApiSendUserOtpDocs,
  ApiVerifyUserOtpDocs,
  ApiEmployeeLoginDocs,
} from '../../swagger/auth.swagger';

@ApiAuthDocs()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiDeviceLoginDocs()
  @Post('device/login')
  deviceLogin(@Body() deviceLoginDto: DeviceLoginDto) {
    return this.authService.deviceLogin(deviceLoginDto);
  }

  @Public()
  @ApiUserSignupDocs()
  @Post('user/signup')
  signupUser(@Body() userSignupDto: UserSignupDto) {
    return this.authService.signupUser(userSignupDto);
  }

  @Public()
  @ApiSendUserOtpDocs()
  @Post('user/send-otp')
  sendUserOtp(@Body() userLoginDto: UserLoginDto) {
    return this.authService.sendUserOtp(userLoginDto.mobileNumber);
  }

  @Public()
  @ApiVerifyUserOtpDocs()
  @Post('user/verify-otp')
  verifyUserOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyUserOtp(verifyOtpDto);
  }

  @Public()
  @ApiEmployeeLoginDocs()
  @Post('employee/login')
  employeeLogin(@Body() employeeLoginDto: EmployeeLoginDto) {
    return this.authService.employeeLogin(employeeLoginDto);
  }
}
