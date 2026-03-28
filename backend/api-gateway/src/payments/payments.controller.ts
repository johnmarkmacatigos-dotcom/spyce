import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PiPaymentService } from './pi.service';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

class ApprovePaymentDto {
  @IsString() @IsNotEmpty()
  paymentId: string;
}

class CompletePaymentDto {
  @IsString() @IsNotEmpty()
  paymentId: string;

  @IsString() @IsNotEmpty()
  txid: string;

  @IsObject()
  metadata: Record<string, any>;
}

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(private piService: PiPaymentService) {}

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Body() dto: ApprovePaymentDto, @Request() req: any) {
    await this.piService.approvePayment(dto.paymentId, req.user.id);
    return { approved: true };
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Body() dto: CompletePaymentDto, @Request() req: any) {
    await this.piService.completePayment(dto.paymentId, dto.txid, req.user.id, dto.metadata);
    return { completed: true };
  }
}
