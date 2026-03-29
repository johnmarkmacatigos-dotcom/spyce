import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { VideosService } from '../videos/videos.service';
import { ChallengesService } from '../challenges/challenges.service';
import { EarningsService } from '../earnings/earnings.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { FeedService } from '../feed/feed.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

// Minimal resolver — connects GraphQL queries to services
// Full schema auto-generated from @ObjectType decorators
@Resolver()
export class MainResolver {
  constructor(
    private users: UsersService,
    private videos: VideosService,
    private challenges: ChallengesService,
    private earnings: EarningsService,
    private marketplace: MarketplaceService,
    private feed: FeedService,
    private leaderboard: LeaderboardService,
  ) {}

  @Query(() => String)
  health(): string {
    return 'SPYCE API is running 🌶';
  }
}