import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RingtonesService } from './ringtones.service';
import { UploadRingtoneDto } from './dto/upload-ringtone.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiRingtonesDocs,
  ApiUploadRingtoneDocs,
  ApiFindByUserRingtonesDocs,
  ApiFindDefaultRingtonesDocs,
  ApiFindOneRingtoneDocs,
  ApiDownloadRingtoneDocs,
  ApiRemoveRingtoneDocs,
} from '../../swagger/ringtones.swagger';

@ApiRingtonesDocs()
@Controller()
export class RingtonesController {
  constructor(private readonly ringtonesService: RingtonesService) {}

  @ApiUploadRingtoneDocs()
  @Post('users/:userId/ringtones')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadRingtoneDto,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    return this.ringtonesService.uploadUserRingtone(userId, file, dto.name);
  }

  @ApiFindByUserRingtonesDocs()
  @Get('users/:userId/ringtones')
  async findByUser(
    @Param('userId') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.ringtonesService.findAllAvailable(userId, pagination);
  }

  @ApiFindDefaultRingtonesDocs()
  @Get('ringtones/defaults')
  async findDefaults(@Query() pagination: PaginationQueryDto) {
    return this.ringtonesService.findDefaults(pagination);
  }

  @ApiFindOneRingtoneDocs()
  @Get('ringtones/:id')
  async findOne(@Param('id') id: string) {
    return this.ringtonesService.findOneById(id);
  }

  @Public()
  @ApiDownloadRingtoneDocs()
  @Get('ringtones/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, contentType, filename } =
      await this.ringtonesService.getDownloadBuffer(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  }

  @ApiRemoveRingtoneDocs()
  @Delete('ringtones/:id')
  async remove(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }
    await this.ringtonesService.deleteUserRingtone(id, userId);
    return { success: true, message: 'Ringtone deleted successfully' };
  }
}
