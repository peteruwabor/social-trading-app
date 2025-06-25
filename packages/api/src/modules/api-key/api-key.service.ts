import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { randomBytes } from 'crypto';

export interface APIKeyCreateDto {
  name?: string;
  scopes: string[];
}

export interface APIKeyWithUsage {
  id: string;
  name?: string;
  key: string;
  scopes: string[];
  status: string;
  lastUsedAt?: Date;
  createdAt: Date;
  usageCount: number;
}

@Injectable()
export class APIKeyService {
  private readonly logger = new Logger(APIKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new API key for a user
   */
  async createAPIKey(userId: string, dto: APIKeyCreateDto): Promise<APIKeyWithUsage> {
    const key = this.generateAPIKey();
    
    const apiKey = await this.prisma.aPIKey.create({
      data: {
        userId,
        key,
        name: dto.name,
        scopes: dto.scopes,
      },
    });

    return {
      ...apiKey,
      name: apiKey.name ?? undefined,
      lastUsedAt: apiKey.lastUsedAt ?? undefined,
      usageCount: 0,
    };
  }

  /**
   * List all API keys for a user
   */
  async listAPIKeys(userId: string): Promise<APIKeyWithUsage[]> {
    const apiKeys = await this.prisma.aPIKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get usage count for each key
    const apiKeysWithUsage = await Promise.all(
      apiKeys.map(async (apiKey) => {
        const usageCount = await this.prisma.webhookDelivery.count({
          where: { apiKeyId: apiKey.id },
        });

        return {
          ...apiKey,
          name: apiKey.name ?? undefined,
          lastUsedAt: apiKey.lastUsedAt ?? undefined,
          usageCount,
        };
      })
    );

    return apiKeysWithUsage;
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.prisma.aPIKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
      },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await this.prisma.aPIKey.update({
      where: { id: apiKeyId },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Validate an API key and return the associated user
   */
  async validateAPIKey(key: string): Promise<{ userId: string; scopes: string[] } | null> {
    const apiKey = await this.prisma.aPIKey.findFirst({
      where: {
        key,
        status: 'ACTIVE',
      },
    });

    if (!apiKey) {
      return null;
    }

    // Update last used timestamp
    await this.prisma.aPIKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: apiKey.userId,
      scopes: apiKey.scopes,
    };
  }

  /**
   * Get API key usage statistics
   */
  async getAPIKeyStats(userId: string) {
    const apiKeys = await this.prisma.aPIKey.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            webhookDeliveries: true,
          },
        },
      },
    });

    const totalKeys = apiKeys.length;
    const activeKeys = apiKeys.filter(key => key.status === 'ACTIVE').length;
    const totalUsage = apiKeys.reduce((sum, key) => sum + key._count.webhookDeliveries, 0);

    return {
      totalKeys,
      activeKeys,
      revokedKeys: totalKeys - activeKeys,
      totalUsage,
      keys: apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        status: key.status,
        usage: key._count.webhookDeliveries,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
      })),
    };
  }

  /**
   * Generate a secure API key
   */
  private generateAPIKey(): string {
    return `gioat_${randomBytes(32).toString('hex')}`;
  }
} 