import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Pi Network Payment Service
 *
 * KEY CLARIFICATION (from official Pi docs):
 * ─────────────────────────────────────────────────────────────────────────────
 * PI_API_KEY = The "API Key" shown at the bottom of your app's dashboard on
 *              the Pi Developer Portal (pi://develop.pinet.com).
 *              This SAME key is used as: Authorization: Key {PI_API_KEY}
 *              when calling the Pi backend API (api.minepi.com).
 *              There is NO separate "Server Key" — PI_API_KEY is the only key.
 *
 * PI_WEBHOOK_SECRET = NOT provided by Pi Network. You CREATE this yourself:
 *              any random string, at least 32 characters. You set it in your
 *              .env AND in the Pi Developer Portal → Webhook Secret field.
 *              It is used to verify that webhook calls actually came from Pi.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️  UPDATE: Set PI_API_KEY in .env — copy from Pi Developer Portal → App Dashboard → "API Key" section
 * ⚠️  UPDATE: Set PI_WEBHOOK_SECRET in .env — make up any random string (32+ chars), then paste the
 *              same string into Pi Developer Portal → App Settings → Webhook Secret field
 */

const PI_API_BASE = 'https://api.minepi.com';

// PI_API_KEY: Your app's API Key from the Pi Developer Portal dashboard
const PI_API_KEY = process.env.PI_API_KEY!;

// PI_WEBHOOK_SECRET: A secret YOU create. Must match what you enter in the Pi Developer Portal.
const PI_WEBHOOK_SECRET = process.env.PI_WEBHOOK_SECRET || 'change-me-in-env';

export const PI_EARN_RATES = {
  reaction_like:    500,        // micro-Pi per like received by creator
  reaction_comment: 1_000,
  reaction_share:   2_000,
  reaction_save:    800,
  watch_15min:      5_000,      // per verified 15-min watch session
  referral_30day:   100_000,    // when referral hits 30 days active
} as const;

export const PLATFORM_FEE_BPS = 500;   // 5%
export const TIP_PLATFORM_BPS = 1_000; // 10%

@Injectable()
export class PiPaymentService {
  private readonly logger = new Logger(PiPaymentService.name);

  // Official Pi API auth: Authorization: Key {your_api_key}
  private readonly headers = {
    Authorization: `Key ${PI_API_KEY}`,
    'Content-Type': 'application/json',
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Step 3 of Pi payment flow: server approves payment
   * Called from onReadyForServerApproval callback on the client
   */
  async approvePayment(paymentId: string, userId: string): Promise<void> {
    this.logger.log(`Approving Pi payment ${paymentId} for user ${userId}`);
    await axios.post(
      `${PI_API_BASE}/v2/payments/${paymentId}/approve`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Step 4 of Pi payment flow: server completes payment after blockchain confirmation
   * Called from onReadyForServerCompletion callback on the client
   */
  async completePayment(
    paymentId: string,
    txid: string,
    userId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    this.logger.log(`Completing Pi payment ${paymentId}, txid=${txid}`);

    // 1. Verify on Pi blockchain
    const { data: piPayment } = await axios.get(
      `${PI_API_BASE}/v2/payments/${paymentId}`,
      { headers: this.headers },
    );

    if (!piPayment.status?.transaction_verified) {
      throw new BadRequestException('Transaction not verified on Pi blockchain');
    }

    // 2. Complete on Pi Network
    await axios.post(
      `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
      { txid },
      { headers: this.headers },
    );

    const microPi = Math.round(piPayment.amount * 1_000_000);

    // 3. Handle based on payment type
    if (metadata.type === 'marketplace_purchase') {
      await this.handleMarketplacePurchase(userId, microPi, paymentId, txid, metadata);
    } else if (metadata.type === 'tip') {
      await this.handleTip(userId, metadata.recipientId, microPi, paymentId, txid);
    } else if (metadata.type === 'vault_lock') {
      await this.handleVaultDeposit(userId, microPi, metadata.durationDays, paymentId, txid);
    } else if (metadata.type === 'content_boost') {
      await this.handleContentBoost(userId, metadata.videoId, microPi, metadata.durationDays, paymentId, txid);
    }
  }

  private async handleMarketplacePurchase(
    buyerId: string,
    amountMicroPi: number,
    paymentId: string,
    txid: string,
    metadata: any,
  ) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: metadata.productId },
    });

    const platformFee = Math.floor(amountMicroPi * (PLATFORM_FEE_BPS / 10_000));

    await this.prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          buyerId,
          sellerId: product.sellerId,
          productId: product.id,
          quantity: metadata.quantity || 1,
          unitPrice: BigInt(product.priceMicroPi),
          totalPrice: BigInt(amountMicroPi),
          platformFee: BigInt(platformFee),
          status: 'escrow',
          escrowTxId: txid,
        },
      });

      if (product.stock !== null) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: metadata.quantity || 1 } },
        });
      }
    });
  }

  private async handleTip(
    senderId: string,
    recipientId: string,
    amountMicroPi: number,
    paymentId: string,
    txid: string,
  ) {
    const creatorAmount = Math.floor(amountMicroPi * (1 - TIP_PLATFORM_BPS / 10_000));
    const creator = await this.prisma.user.update({
      where: { id: recipientId },
      data: { piBalance: { increment: BigInt(creatorAmount) } },
    });
    await this.prisma.piTransaction.create({
      data: {
        userId: recipientId,
        type: 'earn_tip',
        amountMicroPi: BigInt(creatorAmount),
        direction: 'credit',
        balanceAfter: creator.piBalance,
        refType: 'user',
        refId: senderId,
        piTxId: paymentId,
        piTxMemo: txid,
        status: 'completed',
      },
    });
  }

  private async handleVaultDeposit(
    userId: string,
    amountMicroPi: number,
    durationDays: number,
    paymentId: string,
    txid: string,
  ) {
    const lockedUntil = new Date();
    lockedUntil.setDate(lockedUntil.getDate() + durationDays);
    await this.prisma.piVault.create({
      data: {
        userId,
        amount: BigInt(amountMicroPi),
        apyBps: 500,
        lockedUntil,
        status: 'active',
      },
    });
  }

  private async handleContentBoost(
    userId: string,
    videoId: string,
    amountMicroPi: number,
    durationDays: number,
    paymentId: string,
    txid: string,
  ) {
    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + durationDays);
    await this.prisma.video.update({
      where: { id: videoId, userId },
      data: { engagementScore: { increment: 50 } },
    });
  }

  /**
   * Webhook handler — Pi Network sends payment events here.
   * The signature is verified using PI_WEBHOOK_SECRET (which YOU set in both
   * your .env AND the Pi Developer Portal → Webhook Secret field).
   */
  async handleWebhook(body: any, signature: string): Promise<void> {
    // Only verify if a secret is configured
    if (PI_WEBHOOK_SECRET !== 'change-me-in-env' && signature) {
      this.verifyHmacSignature(JSON.stringify(body), signature);
    }
    const { event_type: eventType, payment } = body;
    this.logger.log(`Pi webhook: ${eventType} for payment ${payment?.identifier}`);
  }

  /**
   * Award internal Pi balance for platform activities.
   * This is NOT a blockchain transaction — it's our internal ledger.
   * Anti-abuse: daily caps per earn type, stored in Redis.
   */
  async creditUser(
    userId: string,
    amountMicroPi: bigint,
    type: string,
    refType: string | null,
    refId: string | null,
  ): Promise<bigint> {
    const capKey = `earn:${type}:${userId}:${this.today()}`;
    const capMap: Record<string, number> = {
      earn_reaction: 100,
      earn_watch: 20,
      earn_challenge: 10,
    };
    const cap = capMap[type] ?? 9999;
    const count = await this.redis.incr(capKey);
    await this.redis.expire(capKey, 86400);
    if (count > cap) {
      this.logger.warn(`Daily cap hit for ${userId} type=${type}`);
      return BigInt(0);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { piBalance: { increment: amountMicroPi } },
    });

    await this.prisma.piTransaction.create({
      data: {
        userId,
        type,
        amountMicroPi,
        direction: 'credit',
        balanceAfter: user.piBalance,
        refType,
        refId,
        status: 'completed',
      },
    });

    return user.piBalance;
  }

  private verifyHmacSignature(body: string, signature: string): void {
    const expected = crypto
      .createHmac('sha256', PI_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }
}
