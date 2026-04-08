import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { ChallengesModule } from './challenges/challenges.module';
import { PaymentsModule } from './payments/payments.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { FeedModule } from './feed/feed.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LiveModule } from './live/live.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { EarningsModule } from './earnings/earnings.module';
import { BountiesModule } from './bounties/bounties.module';
import { SearchModule } from './search/search.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    // Rate limiting: 100 req/min auth, 1000/min feed
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 5000,
      },
    ]),

    // Cron jobs
    ScheduleModule.forRoot(),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
    }),

    // Core infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    VideosModule,
    ChallengesModule,
    PaymentsModule,
    MarketplaceModule,
    FeedModule,
    NotificationsModule,
    LiveModule,
    LeaderboardModule,
    EarningsModule,
    BountiesModule,
    SearchModule,
    WebhooksModule,
  ],
})
export class AppModule {}
