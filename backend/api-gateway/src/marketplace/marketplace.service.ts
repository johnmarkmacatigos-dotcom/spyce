import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PiPaymentService } from '../payments/pi.service';
import { NotificationsService } from '../notifications/notifications.service';

const PLATFORM_FEE_RATE = 0.05; // 5%
const AFFILIATE_FEE_RATE = 0.02; // 2% of sale to affiliate

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private piService: PiPaymentService,
    private notificationsService: NotificationsService,
  ) {}

  async createProduct(sellerId: string, input: {
    title: string;
    description?: string;
    category?: string;
    productType: string;
    priceMicroPi: bigint;
    stock?: number;
    mediaKeys?: string[];
    demoVideoId?: string;
    tags?: string[];
  }) {
    return this.prisma.product.create({
      data: {
        sellerId,
        title: input.title,
        description: input.description,
        category: input.category,
        productType: input.productType,
        priceMicroPi: input.priceMicroPi,
        stock: input.stock,
        mediaKeys: input.mediaKeys || [],
        demoVideoId: input.demoVideoId,
        tags: input.tags || [],
      },
      include: {
        seller: { select: { id: true, piUsername: true, displayName: true, avatarUrl: true } },
        demoVideo: true,
      },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, isActive: true },
      include: {
        seller: { select: { id: true, piUsername: true, displayName: true, avatarUrl: true, isVerified: true } },
        demoVideo: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, piUsername: true, displayName: true, avatarUrl: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async searchProducts(query: string, filters?: {
    category?: string;
    productType?: string;
    minPrice?: bigint;
    maxPrice?: bigint;
  }, cursor?: string, limit = 20) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: query ? [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ] : undefined,
        category: filters?.category,
        productType: filters?.productType,
        priceMicroPi: {
          gte: filters?.minPrice,
          lte: filters?.maxPrice,
        },
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [
        { boostedUntil: 'desc' },
        { avgRating: 'desc' },
        { totalSales: 'desc' },
      ],
      include: {
        seller: { select: { id: true, piUsername: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  /**
   * Initiate a marketplace purchase
   * Returns payment intent for Pi payment flow
   */
  async initiatePurchase(buyerId: string, productId: string, quantity = 1, affiliateCode?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.stock !== null && product.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }
    if (product.sellerId === buyerId) {
      throw new ForbiddenException('Cannot purchase your own product');
    }

    const totalPrice = product.priceMicroPi * BigInt(quantity);
    const platformFee = BigInt(Math.floor(Number(totalPrice) * PLATFORM_FEE_RATE));

    // Resolve affiliate
    let affiliateId: string | undefined;
    if (affiliateCode) {
      const affiliate = await this.prisma.user.findFirst({ where: { referralCode: affiliateCode } });
      if (affiliate && affiliate.id !== buyerId && affiliate.id !== product.sellerId) {
        affiliateId = affiliate.id;
      }
    }

    return {
      productId,
      quantity,
      totalPrice: totalPrice.toString(),
      platformFee: platformFee.toString(),
      affiliateId,
      memo: `SPYCE Purchase: ${product.title.slice(0, 50)}`,
      metadata: {
        type: 'marketplace_purchase',
        productId,
        quantity,
        affiliateId,
      },
    };
  }

  /**
   * Buyer confirms delivery — releases escrow to seller
   */
  async confirmDelivery(orderId: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, buyerId },
      include: { product: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'escrow' && order.status !== 'fulfilled') {
      throw new BadRequestException('Order not in escrow/fulfilled state');
    }

    const sellerAmount = order.totalPrice - order.platformFee - order.affiliateFee;

    await this.prisma.$transaction(async (tx) => {
      // Credit seller
      await tx.user.update({
        where: { id: order.sellerId },
        data: { piBalance: { increment: sellerAmount } },
      });

      // Credit affiliate if applicable
      if (order.affiliateId && order.affiliateFee > 0) {
        await tx.user.update({
          where: { id: order.affiliateId },
          data: { piBalance: { increment: order.affiliateFee } },
        });
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });

      // Update product stats
      await tx.product.update({
        where: { id: order.productId },
        data: { totalSales: { increment: order.quantity } },
      });
    });

    await this.notificationsService.sendToUser(order.sellerId, {
      type: 'order_completed',
      title: '💰 Sale Completed!',
      body: `Your order for "${order.product.title}" was confirmed. Pi released to your balance.`,
    });

    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  async fileDispute(orderId: string, userId: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['escrow', 'fulfilled'].includes(order.status)) {
      throw new BadRequestException('Cannot dispute at this order stage');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'disputed', deliveryData: { ...(order.deliveryData as any), disputeReason: reason } },
    });

    return { success: true, message: 'Dispute filed — our team will review within 48h' };
  }

  async submitReview(orderId: string, userId: string, rating: number, body?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, buyerId: userId, status: 'completed' },
    });
    if (!order) throw new NotFoundException('Order not found or not completed');

    const review = await this.prisma.review.create({
      data: { orderId, userId, productId: order.productId, rating, body },
    });

    // Update product avg rating
    const { _avg } = await this.prisma.review.aggregate({
      where: { productId: order.productId },
      _avg: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: order.productId },
      data: { avgRating: _avg.rating || 0 },
    });

    return review;
  }
}
