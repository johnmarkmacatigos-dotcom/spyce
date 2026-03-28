import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ⚠️  UPDATE: Set JWT_PUBLIC_KEY in .env (RS256 public key)
      secretOrKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || 'dev-secret',
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        piUid: true,
        piUsername: true,
        displayName: true,
        role: true,
        kycStatus: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
