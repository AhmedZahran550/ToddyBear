import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Device } from '../../database/entities/device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DevicesService extends DatabaseService<Device> {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
  ) {
    super(deviceRepo);
  }

  async registerDevice(dto: RegisterDeviceDto, userId?: string): Promise<Device> {
    const macAddress = dto.macAddress.toUpperCase().trim();
    let device = await this.findByMacAddress(macAddress);

    if (device) {
      // Update existing device registration
      Object.assign(device, { ...dto, macAddress, userId: userId || device.userId });
      return this.deviceRepo.save(device);
    }

    return this.create({
      ...dto,
      macAddress,
      userId,
      createdBy: userId,
    });
  }

  async findByMacAddress(macAddress: string): Promise<Device | null> {
    return this.findOneBy({ macAddress: macAddress.toUpperCase().trim() } as any);
  }

  async findByUser(userId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, { where: { userId } });
  }

  async markHardwareSeen(macAddress: string): Promise<void> {
    const device = await this.findByMacAddress(macAddress);
    if (device) {
      device.isOnline = true;
      device.lastSeenAt = new Date();
      await this.deviceRepo.save(device);
    }
  }
}
