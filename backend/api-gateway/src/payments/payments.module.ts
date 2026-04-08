import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PiPaymentService } from './pi.service';
import { PaymentsController } from './payments.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: 'video-transcode' }),
  ],
  providers: [PiPaymentService],
  controllers: [PaymentsController],
  exports: [PiPaymentService],
})
export class PaymentsModule {}
