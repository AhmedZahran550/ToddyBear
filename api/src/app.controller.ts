import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import {
  ApiAppDocs,
  ApiGetHelloDocs,
  ApiHealthCheckDocs,
} from './swagger/app.swagger';

@ApiAppDocs()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @ApiGetHelloDocs()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @ApiHealthCheckDocs()
  @Get('health')
  healthCheck(): any {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
