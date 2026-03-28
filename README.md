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

## 🏗️ Architecture Decisions & Notes

### Pi Payment Flow
The Pi payment system is 4-step and **fully asynchronous**:
1. Client calls our server to create payment intent
2. Client calls `Pi.createPayment()` → Pi Browser shows confirmation
3. `onReadyForServerApproval` → our server calls Pi API to approve
4. `onReadyForServerCompletion` → Pi broadcasts on blockchain → our server completes

All Pi amounts are stored as `BIGINT` micro-Pi (1 Pi = 1,000,000 micro-Pi) to avoid floating point errors.

### Video Pipeline
- Raw upload: Client → S3 presigned URL (direct, no server proxy)
- Transcoding: S3 event → BullMQ job → FFmpeg worker → HLS segments → S3 → CloudFront
- For high volume (>1000 videos/day): Switch `transcode.processor.ts` to AWS MediaConvert (instructions inline)

### Feed Algorithm
Currently: recency + engagement score (40/25/20/10/5 weighted)
For Phase 2: Replace `feed.service.ts` with the Two-Tower neural network (train on user interaction data)

### AI Challenge Verification
- Pose estimation: MediaPipe (runs on CPU, ~2-5 sec per video)
- For GPU-backed inference: Deploy AI service on EC2 G4dn.xlarge with CUDA

### Earning Anti-Abuse
- Per-type daily caps in Redis (see `pi.service.ts → creditUser()`)
- Fraud detection: Isolation Forest on earning patterns (Phase 3)
- Pi ecosystem: All in-app Pi is *internal balance* until user withdraws to Pi wallet

---

## 📋 Phase Roadmap (from spec)

| Phase | Timeline | Key Features |
|-------|----------|-------------|
| **MVP** | Months 1–3 | Auth, video feed, 5 challenge types, basic Pi earning, digital marketplace, vaults |
| **Beta** | Months 4–6 | Live streaming, duets/stitches, AI verification, squads, physical marketplace, creator dashboard, 3D UI |
| **Full Launch** | Months 7–12 | Watch-to-earn, NFTs, creator fund, affiliate system, AR filters, multi-language, Pi mainnet, web app |

---

## 📞 Key Service URLs (local dev)

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:4000 |
| GraphQL Playground | http://localhost:4000/graphql |
| WebSocket | ws://localhost:4000/ws |
| AI Service | http://localhost:8001 |
| RabbitMQ UI | http://localhost:15672 (spyce/spyce_dev_pass) |
| Prisma Studio | http://localhost:5555 (run `npx prisma studio`) |

---

*Built with ❤️ for the Pi Network ecosystem. SPYCE — where content meets currency.*
