import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// ⚠️  UPDATE: These env vars must be set in .env
const PI_API_BASE = 'https://api.minepi.com';
const PI_API_KEY = process.env.PI_API_KEY!; // Your Pi app API key from Pi Developer Portal

interface PiMeResponse {
  uid: string;
  username: string;
  credentials?: {
    scopes: string[];
    valid_until: { timestamp: string };
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Verify Pi Network access token and return SPYCE JWT
   * Called from POST /api/v1/auth/pi
   */
  async authenticateWithPi(piAccessToken: string, piUid: string) {
    // Step 1: Verify token with Pi Network API
    let piUser: PiMeResponse;
    try {
      const response = await axios.get<PiMeResponse>(`${PI_API_BASE}/v2/me`, {
        headers: {
          Authorization: `Bearer ${piAccessToken}`,
        },
      });
      piUser = response.data;
    } catch (err) {
      this.logger.error('Pi token verification failed', err);
      throw new UnauthorizedException('Invalid Pi Network token');
    }

    // Step 2: Validate UID matches
    if (piUser.uid !== piUid) {
      throw new UnauthorizedException('UID mismatch');
    }

    // Step 3: Upsert user in our database
    let user = await this.prisma.user.findUnique({
      where: { piUid: piUser.uid },
    });

    if (!user) {
      // New user - create with referral code
      user = await this.prisma.user.create({
        data: {
          piUid: piUser.uid,
          piUsername: piUser.username,
          displayName: piUser.username,
          referralCode: this.generateReferralCode(piUser.username),
          settings: {
            create: {},
          },
        },
        include: { settings: true },
      });
      this.logger.log(`New user registered: ${piUser.username}`);
    } else {
      // Update last active
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          piUsername: piUser.username, // sync username
          lastActiveAt: new Date(),
        },
      });
    }

    // Step 4: Issue SPYCE JWT (15min) + refresh token (30 days)
    const payload = {
      sub: user.id,
      piUid: user.piUid,
      piUsername: user.piUsername,
      role: user.role,
    };

    const jwt = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return { jwt, refreshToken, user };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        // ⚠️  UPDATE: JWT_PUBLIC_KEY in env
        publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n'),
        algorithms: ['RS256'],
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException();
      }

      const newPayload = {
        sub: user.id,
        piUid: user.piUid,
        piUsername: user.piUsername,
        role: user.role,
      };

      return {
        jwt: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, { expiresIn: '30d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateReferralCode(username: string): string {
    const clean = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${clean}${suffix}`;
  }
}
