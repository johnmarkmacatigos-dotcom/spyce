import { Resolver, Query, Mutation, Args, Context, ID, Float, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VideosService } from '../videos/videos.service';
import { FeedService } from '../feed/feed.service';
import { ChallengesService } from '../challenges/challenges.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { UsersService } from '../users/users.service';
import { EarningsService } from '../earnings/earnings.service';
import { PiPaymentService } from '../payments/pi.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

// ────────────────────────────────────────────────────────────
// GraphQL Object Types
// ────────────────────────────────────────────────────────────

@ObjectType()
export class UserType {
  @Field(() => ID) id: string;
  @Field() piUsername: string;
  @Field() displayName: string;
  @Field({ nullable: true }) bio?: string;
  @Field({ nullable: true }) avatarUrl?: string;
  @Field({ nullable: true }) coverUrl?: string;
  @Field(() => Int) spyceScore: number;
  @Field(() => Float) piBalance: number;
  @Field(() => Int) followerCount: number;
  @Field(() => Int) followingCount: number;
  @Field({ nullable: true }) isFollowing?: boolean;
  @Field() isVerified: boolean;
  @Field() createdAt: Date;
}

@ObjectType()
export class VideoType {
  @Field(() => ID) id: string;
  @Field({ nullable: true }) title?: string;
  @Field({ nullable: true }) description?: string;
  @Field() hlsUrl: string;
  @Field({ nullable: true }) thumbnailUrl?: string;
  @Field(() => Int) durationSecs: number;
  @Field(() => Int) viewCount: number;
  @Field(() => Int) likeCount: number;
  @Field(() => Int) commentCount: number;
  @Field(() => Int) shareCount: number;
  @Field({ nullable: true }) hasLiked?: boolean;
  @Field(() => [String]) hashtags: string[];
  @Field() publishedAt: Date;
}

@ObjectType()
export class ChallengeType {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field({ nullable: true }) description?: string;
  @Field() category: string;
  @Field() difficulty: string;
  @Field(() => Float) piReward: number;
  @Field({ nullable: true }) verification?: string;
  @Field(() => Float, { nullable: true }) targetValue?: number;
  @Field({ nullable: true }) targetUnit?: string;
  @Field(() => Int) currentStreak: number;
  @Field() completedToday: boolean;
}

@ObjectType()
export class ProductType {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field({ nullable: true }) description?: string;
  @Field() productType: string;
  @Field({ nullable: true }) category?: string;
  @Field(() => Float) pricePi: number;
  @Field(() => Int, { nullable: true }) stock?: number;
  @Field(() => [String]) mediaUrls: string[];
  @Field(() => Float) avgRating: number;
  @Field(() => Int) totalSales: number;
}

@ObjectType()
export class EarningsSummaryType {
  @Field(() => Float) totalEarned: number;
  @Field(() => Float) challengeEarnings: number;
  @Field(() => Float) reactionEarnings: number;
  @Field(() => Float) referralEarnings: number;
  @Field(() => Float) creatorFundEarnings: number;
  @Field(() => Float) currentBalance: number;
}

@ObjectType()
export class AuthPayloadType {
  @Field() jwt: string;
  @Field() refreshToken: string;
}

@ObjectType()
export class ReactionResultType {
  @Field() reacted: boolean;
  @Field(() => Int) likeCount: number;
}

@ObjectType()
export class UploadUrlPayloadType {
  @Field() videoId: string;
  @Field() uploadUrl: string;
}

@ObjectType()
export class PiPaymentIntentType {
  @Field(() => Float) amount: number;
  @Field() memo: string;
}

// ────────────────────────────────────────────────────────────
// Input Types
// ────────────────────────────────────────────────────────────

@InputType()
export class PublishVideoInput {
  @Field(() => ID) videoId: string;
  @Field({ nullable: true }) title?: string;
  @Field({ nullable: true }) description?: string;
  @Field({ nullable: true }) visibility?: string;
  @Field(() => [String], { nullable: true }) hashtags?: string[];
  @Field({ nullable: true }) soundId?: string;
  @Field({ nullable: true }) isChallenge?: boolean;
  @Field({ nullable: true }) challengeId?: string;
}

@InputType()
export class ChallengeProofInput {
  @Field(() => ID) challengeId: string;
  @Field() proofType: string;
  @Field({ nullable: true }) proofUrl?: string;
}

@InputType()
export class ProductInput {
  @Field() title: string;
  @Field({ nullable: true }) description?: string;
  @Field({ nullable: true }) category?: string;
  @Field() productType: string;
  @Field(() => Float) pricePi: number;
  @Field(() => Int, { nullable: true }) stock?: number;
  @Field(() => [String], { nullable: true }) tags?: string[];
}

// ────────────────────────────────────────────────────────────
// Main Resolver
// ────────────────────────────────────────────────────────────

@Resolver()
export class MainResolver {
  constructor(
    private videos: VideosService,
    private feed: FeedService,
    private challenges: ChallengesService,
    private marketplace: MarketplaceService,
    private users: UsersService,
    private earnings: EarningsService,
    private piService: PiPaymentService,
    private leaderboard: LeaderboardService,
  ) {}

  // ── Queries ──────────────────────────────────────────────

  @Query(() => UserType)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return this.users.getProfile(user.id, user.id);
  }

  @Query(() => UserType, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async user(
    @CurrentUser() currentUser: any,
    @Args('id', { type: () => ID, nullable: true }) id?: string,
    @Args('piUsername', { nullable: true }) piUsername?: string,
  ) {
    const targetId = id || (piUsername ? await this.users.getIdByUsername(piUsername) : null);
    if (!targetId) return null;
    return this.users.getProfile(targetId, currentUser.id);
  }

  @Query(() => [VideoType])
  @UseGuards(JwtAuthGuard)
  async forYouFeed(
    @CurrentUser() user: any,
    @Args('cursor', { nullable: true }) cursor?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.feed.getForYouFeed(user.id, cursor, limit);
  }

  @Query(() => [VideoType])
  @UseGuards(JwtAuthGuard)
  async followingFeed(
    @CurrentUser() user: any,
    @Args('cursor', { nullable: true }) cursor?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.feed.getFollowingFeed(user.id, cursor, limit);
  }

  @Query(() => [ChallengeType])
  @UseGuards(JwtAuthGuard)
  async dailyChallenges(@CurrentUser() user: any) {
    const templates = await this.challenges.getDailyChallenges();
    // Attach user progress to each challenge
    return Promise.all(
      templates.map(async (t) => {
        const progress = await this.challenges.getUserProgress(user.id, t.id);
        return {
          ...t,
          piReward: Number(t.piReward) / 1_000_000,
          currentStreak: progress.currentStreak,
          completedToday: progress.completedToday,
        };
      }),
    );
  }

  @Query(() => EarningsSummaryType)
  @UseGuards(JwtAuthGuard)
  async myEarnings(@CurrentUser() user: any, @Args('period') period: string) {
    return this.earnings.getSummary(user.id, period);
  }

  @Query(() => ProductType, { nullable: true })
  async product(@Args('id', { type: () => ID }) id: string) {
    const p = await this.marketplace.getProduct(id);
    return {
      ...p,
      pricePi: Number(p.priceMicroPi) / 1_000_000,
      mediaUrls: (p.mediaKeys || []).map(
        (k) => `${process.env.CLOUDFRONT_DOMAIN}/${k}`,
      ),
    };
  }

  // ── Mutations ────────────────────────────────────────────

  @Mutation(() => UploadUrlPayloadType)
  @UseGuards(JwtAuthGuard)
  async createVideoUploadUrl(
    @CurrentUser() user: any,
    @Args('filename') filename: string,
    @Args('contentType') contentType: string,
  ) {
    return this.videos.createUploadUrl(user.id, filename, contentType);
  }

  @Mutation(() => VideoType)
  @UseGuards(JwtAuthGuard)
  async publishVideo(
    @CurrentUser() user: any,
    @Args('input') input: PublishVideoInput,
  ) {
    return this.videos.publishVideo(input.videoId, user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteVideo(
    @CurrentUser() user: any,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.videos.deleteVideo(id, user.id);
  }

  @Mutation(() => ReactionResultType)
  @UseGuards(JwtAuthGuard)
  async reactToVideo(
    @CurrentUser() user: any,
    @Args('videoId', { type: () => ID }) videoId: string,
    @Args('type') type: string,
  ) {
    return this.videos.reactToVideo(videoId, user.id, type, this.earnings);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async followUser(
    @CurrentUser() user: any,
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.users.followUser(user.id, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async submitChallengeProof(
    @CurrentUser() user: any,
    @Args('input') input: ChallengeProofInput,
  ) {
    await this.challenges.submitProof(user.id, {
      challengeId: input.challengeId,
      proofType: input.proofType,
      proofUrl: input.proofUrl,
    });
    return true;
  }

  @Mutation(() => PiPaymentIntentType)
  @UseGuards(JwtAuthGuard)
  async purchaseProduct(
    @CurrentUser() user: any,
    @Args('productId', { type: () => ID }) productId: string,
    @Args('quantity', { type: () => Int, nullable: true }) quantity?: number,
    @Args('affiliateId', { type: () => ID, nullable: true }) affiliateId?: string,
  ) {
    return this.marketplace.initiatePurchase(user.id, productId, quantity, affiliateId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async confirmDelivery(
    @CurrentUser() user: any,
    @Args('orderId', { type: () => ID }) orderId: string,
  ) {
    await this.marketplace.confirmDelivery(orderId, user.id);
    return true;
  }

  @Mutation(() => ProductType)
  @UseGuards(JwtAuthGuard)
  async createProduct(
    @CurrentUser() user: any,
    @Args('input') input: ProductInput,
  ) {
    return this.marketplace.createProduct(user.id, {
      ...input,
      priceMicroPi: Math.round(input.pricePi * 1_000_000),
    });
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async approvePiPayment(
    @CurrentUser() user: any,
    @Args('paymentId') paymentId: string,
  ) {
    await this.piService.approvePayment(paymentId, user.id);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async completePiPayment(
    @CurrentUser() user: any,
    @Args('paymentId') paymentId: string,
    @Args('txId') txId: string,
    @Args('metadata') metadata: string,
  ) {
    await this.piService.completePayment(paymentId, txId, user.id, JSON.parse(metadata));
    return true;
  }
}
