import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, requesterId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        settings: true,
        _count: {
          select: {
            followersList: true,
            followingList: true,
            videos: { where: { status: 'published' } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    let isFollowing = false;
    if (requesterId && requesterId !== id) {
      const follow = await this.prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: requesterId, followingId: id } },
      });
      isFollowing = !!follow;
    }

    return {
      ...user,
      followerCount: user._count.followersList,
      followingCount: user._count.followingList,
      videoCount: user._count.videos,
      isFollowing,
    };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error('Cannot follow yourself');

    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await this.prisma.userFollow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      return { following: false };
    }

    await this.prisma.userFollow.create({ data: { followerId, followingId } });
    return { following: true };
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { displayName: data.displayName, bio: data.bio },
    });
  }

  async getUserVideos(userId: string, requesterId?: string) {
    return this.prisma.video.findMany({
      where: {
        userId,
        status: 'published',
        visibility: requesterId === userId ? undefined : 'public',
      },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    });
  }
}
