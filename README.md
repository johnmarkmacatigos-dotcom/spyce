# 🌶 SPYCE — Full Technical Codebase

> **Short-Form Video · Challenge Engine · Pi Network Economy · Marketplace**
>
> TikTok-style viral content fused with daily challenges, Pi-powered earnings, and peer-to-peer commerce.

---

## 📦 What's in This Repository

```
spyce/
├── apps/
│   └── mobile/                    React Native + Expo 51 mobile app
│       ├── app/                   Expo Router file-based navigation
│       │   ├── (auth)/            Login screen
│       │   ├── (tabs)/            Main tab navigator (feed, challenges, camera, marketplace, earnings)
│       │   ├── video/             Video detail, publish
│       │   ├── profile/           User profile
│       │   ├── challenge/         Challenge detail, leaderboard
│       │   ├── marketplace/       Product detail, create
│       │   └── live/              Live stream viewer
│       └── src/
│           ├── screens/           Full screen components per section
│           ├── components/
│           │   ├── 3d/            Three.js: OnboardingGlobe, SpyceScoreBadge, PiCoinBurst
│           │   ├── video/         VideoCard, FeedSidebar
│           │   ├── challenge/     Challenge components
│           │   └── ui/            Shared UI components
│           ├── services/          api.ts, piAuth.ts (Pi SDK integration)
│           └── store/             Zustand: authStore, feedStore
│
├── backend/
│   ├── api-gateway/               NestJS monolith (Phase 1) — splits into microservices later
│   │   ├── prisma/
│   │   │   └── schema.prisma      Full database schema (all 20+ models)
│   │   └── src/
│   │       ├── auth/              Pi Network auth → SPYCE JWT
│   │       ├── users/             Profiles, follows, settings
│   │       ├── videos/            Upload URL, publish, reactions, comments
│   │       │   └── transcode.processor.ts  FFmpeg HLS pipeline
│   │       ├── feed/              FYP algorithm, following feed, trending
│   │       ├── challenges/        Daily challenges, verification, streaks
│   │       ├── payments/          Pi payment flow, earning engine, vaults
│   │       ├── marketplace/       Products, orders, escrow, reviews
│   │       ├── earnings/          EarningsEngine + cron jobs (creator fund, vault unlocks)
│   │       ├── live/              Live streaming, gifts, chat
│   │       ├── leaderboard/       Rankings with daily snapshots
│   │       ├── search/            Full-text search (PostgreSQL → OpenSearch)
│   │       ├── bounties/          Brand bounty board
│   │       ├── notifications/     Push (FCM), in-app, WebSocket gateway
│   │       └── webhooks/          Pi Network, AI service, S3 callbacks
│   │
│   └── ai-service/                Python FastAPI
│       ├── main.py                Pose estimation, engagement scoring, moderation
│       └── requirements.txt
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql Full PostgreSQL schema + seed data
│
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.yml     Local dev: Postgres, Redis, RabbitMQ, API, AI
│   └── k8s/
│       └── deployment.yml         Production EKS deployment + HPA + Ingress
│
└── .github/
    └── workflows/
        └── deploy.yml             CI/CD: test → build → push ECR → deploy EKS
```

---

*Built with ❤️ for the Pi Network ecosystem. SPYCE — where content meets currency.*
