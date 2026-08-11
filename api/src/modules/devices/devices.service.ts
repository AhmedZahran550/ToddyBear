import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

  async registerDevice(dto: RegisterDeviceDto): Promise<Device> {
    const macAddress = dto.macAddress.toUpperCase().trim();
    const serialNumber = dto.serialNumber.trim();

    const existingMac = await this.findByMacAddress(macAddress);
    if (existingMac) {
      throw new ConflictException(`Device with MAC ${macAddress} already exists`);
    }

    const existingSerial = await this.findBySerialNumber(serialNumber);
    if (existingSerial) {
      throw new ConflictException(
        `Device with serial number ${serialNumber} already exists`,
      );
    }

    return this.create({
      macAddress,
      serialNumber,
      name: dto.name,
    });
  }

  async connectBySerialNumber(
    serialNumber: string,
    userId: string,
  ): Promise<Device> {
    const cleanSerial = serialNumber.trim();
    const device = await this.findBySerialNumber(cleanSerial);

    if (!device) {
      throw new NotFoundException(
        `No device found with serial number: ${cleanSerial}`,
      );
    }

    if (device.userId && device.userId !== userId) {
      throw new ConflictException(
        `Device ${cleanSerial} is already registered to another user account.`,
      );
    }

    device.userId = userId;
    return this.deviceRepo.save(device);
  }

  async findByMacAddress(macAddress: string): Promise<Device | null> {
    return this.findOne({
      where: { macAddress: macAddress.toUpperCase().trim() },
    });
  }

  async findBySerialNumber(serialNumber: string): Promise<Device | null> {
    return this.findOne({
      where: { serialNumber: serialNumber.trim() },
    });
  }

  async findByMacAddressWithUser(macAddress: string): Promise<Device | null> {
    return this.deviceRepo.findOne({
      where: { macAddress: macAddress.toUpperCase().trim() },
      relations: { user: true },
    });
  }

  async findByIdWithUser(id: string): Promise<Device | null> {
    return this.deviceRepo.findOne({
      where: { id },
      relations: { user: true },
    });
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
