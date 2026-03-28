import {
  Controller, Post, Body, Headers, RawBodyRequest, Req,
  HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PiPaymentService } from '../payments/pi.service';
import { ChallengesService } from '../challenges/challenges.service';

// ⚠️  UPDATE: Set AI_SERVICE_SECRET in .env
const AI_SECRET = process.env.AI_SERVICE_SECRET || 'dev-secret';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private piPaymentService: PiPaymentService,
    private challengesService: ChallengesService,
  ) {}

  /**
   * Pi Network webhook — payment status events
   * Pi signs with HMAC-SHA256 using your PI_WEBHOOK_SECRET
   */
  @Post('pi-payment')
  @HttpCode(HttpStatus.OK)
  async handlePiPaymentWebhook(
    @Body() body: any,
    @Headers('x-pi-signature') signature: string,
  ) {
    this.logger.log(`Pi webhook received: ${body?.event_type}`);
    await this.piPaymentService.handleWebhook(body, signature);
    return { received: true };
  }

  /**
   * Handle incomplete Pi payment found during auth
   */
  @Post('pi-incomplete')
  @HttpCode(HttpStatus.OK)
  async handleIncompletePayment(@Body() body: { paymentId: string }) {
    this.logger.log(`Incomplete payment: ${body.paymentId}`);
    // Pi SDK handles this — we just log it for now
    // ⚠️  UPDATE: Check payment status and complete/cancel as needed
    return { received: true };
  }

  /**
   * AI service callback — challenge verification result
   * Secured with X-AI-Secret header
   */
  @Post('challenge-verify')
  @HttpCode(HttpStatus.OK)
  async handleChallengeVerify(
    @Body() body: {
      completionId: string;
      verified: boolean;
      aiConfidence: number;
      details?: any;
    },
    @Headers('x-ai-secret') secret: string,
  ) {
    if (secret !== AI_SECRET) {
      this.logger.warn('Invalid AI service secret in webhook');
      return { error: 'Unauthorized' };
    }

    await this.challengesService.verifyCompletion(
      body.completionId,
      body.verified,
      body.aiConfidence,
    );

    return { processed: true };
  }

  /**
   * AWS S3 event → video upload complete → trigger transcode
   * Configure S3 bucket notification → SQS → this endpoint
   */
  @Post('s3-video-upload')
  @HttpCode(HttpStatus.OK)
  async handleS3VideoUpload(@Body() body: any) {
    // S3 sends SNS confirmation first
    if (body.Type === 'SubscriptionConfirmation') {
      this.logger.log('S3 SNS subscription confirmation received');
      // ⚠️  UPDATE: Auto-confirm by fetching the SubscribeURL
      return { received: true };
    }

    const records = body.Records || [];
    for (const record of records) {
      const key = record.s3?.object?.key;
      if (key?.startsWith('raw/')) {
        this.logger.log(`New video upload: ${key}`);
        // Transcode queue is triggered by the video publish endpoint directly
        // This webhook is a backup trigger for any missed events
      }
    }

    return { processed: true };
  }
}
