import { Module, forwardRef } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [forwardRef(() => DevicesModule)],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
