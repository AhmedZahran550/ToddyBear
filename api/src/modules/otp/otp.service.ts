import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Otp } from '../../database/entities/otp.entity';

@Injectable()
export class OtpService {
  private readonly MAX_OTP_PER_HOUR = 3;
  private readonly OTP_TTL_MINUTES = 5;

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
  ) {}

  async generateOtp(mobileNumber: string): Promise<string> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.otpRepo.count({
      where: {
        mobileNumber,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    if (recentCount >= this.MAX_OTP_PER_HOUR) {
      throw new BadRequestException(
        'Too many OTP requests. Maximum 3 per hour. Please try again later.',
      );
    }

    const code = '999999'; // Hardcoded in development mode

    const otp = this.otpRepo.create({
      mobileNumber,
      code,
      expiresAt: new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000),
      isUsed: false,
    });
    await this.otpRepo.save(otp);
    return code;
  }

  async verifyOtp(mobileNumber: string, code: string): Promise<boolean> {
    const otp = await this.otpRepo.findOne({
      where: { mobileNumber, code, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      return false;
    }

    // Mark ALL OTPs for this mobile number as used upon successful verification
    await this.otpRepo.update(
      { mobileNumber, isUsed: false },
      { isUsed: true, usedAt: new Date() },
    );

    return true;
  }
}
