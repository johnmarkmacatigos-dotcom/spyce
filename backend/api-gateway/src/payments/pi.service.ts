import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import axios from 'axios';
import * as crypto from 'crypto';

// ⚠️  UPDATE: Set PI_SERVER_KEY in .env — from Pi Developer Portal → App Settings
const PI_API_BASE = 'https://api.minepi.com';
const PI_SERVER_KEY = process.env.PI_SERVER_KEY!;
// ⚠️  UPDATE: Set PI_WEBHOOK_SECRET in .env — used to verify Pi webhook HMAC signatures
const PI_WEBHOOK_SECRET = process.env.PI_WEBHOOK_SECRET!;

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

  private readonly headers = {
    Authorization: `Key ${PI_SERVER_KEY}`,
    'Content-Type': 'application/json',
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Step 3 of Pi payment flow: approve payment so Pi browser can proceed
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
   * Step 4 of Pi payment flow: complete after blockchain confirmation
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
      include: { seller: true },
    });

    const platformFee = Math.floor(amountMicroPi * (PLATFORM_FEE_BPS / 10_000));
    const sellerAmount = amountMicroPi - platformFee;

    await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
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

      // Credit seller (held in escrow via order status)
      await this.recordTransaction(tx, product.sellerId, 'spend_purchase', BigInt(sellerAmount), 'credit', 'marketplace_order', order.id, paymentId, txid);

      // Decrement stock
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

    await this.prisma.$transaction(async (tx) => {
      // Credit creator
      const creator = await tx.user.update({
        where: { id: recipientId },
        data: { piBalance: { increment: BigInt(creatorAmount) } },
      });
      await this.recordTransaction(tx, recipientId, 'earn_tip', BigInt(creatorAmount), 'credit', 'user', senderId, paymentId, txid, creator.piBalance);
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
        apyBps: 500, // 5% APY
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
      data: { engagementScore: { increment: 50 } }, // Boost feed ranking
    });
  }

  /**
   * Webhook handler: Pi Network → our server
   * Verifies HMAC signature then processes event
   */
  async handleWebhook(body: any, signature: string): Promise<void> {
    this.verifyHmacSignature(JSON.stringify(body), signature);

    const { event_type: eventType, payment } = body;

    if (eventType === 'payment_completed' || eventType === 'payment_approved') {
      this.logger.log(`Pi webhook: ${eventType} for payment ${payment?.identifier}`);
      // Webhook is supplementary — main flow is client-driven
    }
  }

  /**
   * Award Pi to a user for platform activities (challenges, reactions, etc.)
   * Internal use only — not a Pi blockchain transaction
   */
  async creditUser(
    userId: string,
    amountMicroPi: bigint,
    type: string,
    refType: string | null,
    refId: string | null,
  ): Promise<bigint> {
    // Anti-abuse: check daily earn cap
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

  private async recordTransaction(
    tx: any,
    userId: string,
    type: string,
    amount: bigint,
    direction: string,
    refType: string,
    refId: string,
    piTxId: string,
    txid: string,
    balanceAfter?: bigint,
  ) {
    await tx.piTransaction.create({
      data: {
        userId,
        type,
        amountMicroPi: amount,
        direction,
        balanceAfter: balanceAfter ?? BigInt(0),
        refType,
        refId,
        piTxId,
        piTxMemo: txid,
        status: 'completed',
      },
    });
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
