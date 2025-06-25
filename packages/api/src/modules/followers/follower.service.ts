import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class FollowerService {
  constructor(private readonly prisma: PrismaService) {}

  async setAutoCopy(leaderId: string, followerId: string, enabled: boolean) {
    return this.prisma.follower.upsert({
      where: {
        leaderId_followerId: {
          leaderId,
          followerId,
        },
      },
      update: {
        autoCopy: enabled,
      },
      create: {
        leaderId,
        followerId,
        autoCopy: enabled,
        alertOnly: !enabled, // Default to alert-only if auto-copy is disabled
      },
    });
  }

  async listFollowersForLeader(leaderId: string) {
    return this.prisma.follower.findMany({
      where: {
        leaderId,
      },
      select: {
        id: true,
        followerId: true,
        autoCopy: true,
        alertOnly: true,
        createdAt: true,
      },
    });
  }
} 