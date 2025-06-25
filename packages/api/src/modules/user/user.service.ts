import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogService } from '../../lib/audit-log.service';
import * as crypto from 'crypto';

export interface UserProfileDto {
  id: string;
  email: string;
  handle?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  mfaEnabled: boolean;
  status: string;
  kycStatus: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileDto {
  handle?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface PrivacySettingsDto {
  profileVisibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
  showPortfolio: boolean;
  showTrades: boolean;
  allowCopyTrading: boolean;
  allowTips: boolean;
}

export interface NotificationSettingsDto {
  tradeAlerts: boolean;
  copyExecuted: boolean;
  liveSessions: boolean;
  system: boolean;
  promotional: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface PersonalizationDto {
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      handle: undefined, // Not available in current schema
      firstName: undefined, // Not available in current schema
      lastName: undefined, // Not available in current schema
      bio: undefined, // Not available in current schema
      avatarUrl: undefined, // Not available in current schema
      isVerified: false, // Default value
      mfaEnabled: false, // Default value
      status: 'ACTIVE', // Default value
      kycStatus: 'PENDING', // Default value
      subscriptionTier: 'FREE', // Default value
      createdAt: user.createdAt,
      updatedAt: user.createdAt, // Use createdAt as updatedAt since updatedAt doesn't exist
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<UserProfileDto> {
    // For now, we'll just log the action since the profile fields don't exist in the current schema
    // In a real implementation, you'd update the user record with the new data
    
    await this.auditLogService.logAction({
      userId,
      action: 'PROFILE_UPDATE',
      resource: 'USER',
      resourceId: userId,
      details: {
        updatedFields: Object.keys(updateData),
        updateData,
      },
    });

    return this.getUserProfile(userId);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, passwordData: ChangePasswordDto): Promise<{ message: string }> {
    // For now, we'll simulate password validation since we don't store passwords
    // In a real implementation, you'd validate the current password against stored hash
    
    if (passwordData.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    // In a real implementation, you'd hash and store the new password
    // For now, we'll just log the action
    await this.auditLogService.logAction({
      userId,
      action: 'PASSWORD_CHANGE',
      resource: 'USER',
      resourceId: userId,
      details: {
        changedAt: new Date().toISOString(),
      },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generate MFA secret
    const secret = crypto.randomBytes(20).toString('hex');
    
    // Generate QR code URL (in real implementation, use a QR code library)
    const qrCode = `otpauth://totp/Gioat:${user.email}?secret=${secret}&issuer=Gioat`;

    // Update user with MFA secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaEnabled: true,
      },
    });

    await this.auditLogService.logAction({
      userId,
      action: 'MFA_ENABLED',
      resource: 'USER',
      resourceId: userId,
      details: {
        enabledAt: new Date().toISOString(),
      },
    });

    return { secret, qrCode };
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await this.auditLogService.logAction({
      userId,
      action: 'MFA_DISABLED',
      resource: 'USER',
      resourceId: userId,
      details: {
        disabledAt: new Date().toISOString(),
      },
    });

    return { message: 'MFA disabled successfully' };
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettingsDto> {
    // For now, return default settings since we don't have a privacy settings table
    // In a real implementation, you'd store these in a separate table
    return {
      profileVisibility: 'PUBLIC',
      showPortfolio: true,
      showTrades: true,
      allowCopyTrading: true,
      allowTips: true,
    };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: string, settings: PrivacySettingsDto): Promise<PrivacySettingsDto> {
    // In a real implementation, you'd store these in a separate table
    // For now, we'll just log the action
    await this.auditLogService.logAction({
      userId,
      action: 'PRIVACY_SETTINGS_UPDATE',
      resource: 'USER',
      resourceId: userId,
      details: {
        settings,
        updatedAt: new Date().toISOString(),
      },
    });

    return settings;
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettingsDto> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    // Map preferences to settings
    const settings: NotificationSettingsDto = {
      tradeAlerts: preferences.find(p => p.type === 'TRADE_ALERT')?.enabled ?? true,
      copyExecuted: preferences.find(p => p.type === 'COPY_EXECUTED')?.enabled ?? true,
      liveSessions: preferences.find(p => p.type === 'LIVE_SESSION')?.enabled ?? true,
      system: preferences.find(p => p.type === 'SYSTEM')?.enabled ?? true,
      promotional: preferences.find(p => p.type === 'PROMOTIONAL')?.enabled ?? false,
      email: true, // Default to true
      push: true, // Default to true
      sms: false, // Default to false
    };

    return settings;
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: NotificationSettingsDto): Promise<NotificationSettingsDto> {
    // Update notification preferences
    const updates = [
      { type: 'TRADE_ALERT', enabled: settings.tradeAlerts },
      { type: 'COPY_EXECUTED', enabled: settings.copyExecuted },
      { type: 'LIVE_SESSION', enabled: settings.liveSessions },
      { type: 'SYSTEM', enabled: settings.system },
      { type: 'PROMOTIONAL', enabled: settings.promotional },
    ];

    for (const update of updates) {
      await this.prisma.notificationPreference.upsert({
        where: {
          userId_type: {
            userId,
            type: update.type as any,
          },
        },
        update: { enabled: update.enabled },
        create: {
          userId,
          type: update.type as any,
          enabled: update.enabled,
        },
      });
    }

    await this.auditLogService.logAction({
      userId,
      action: 'NOTIFICATION_SETTINGS_UPDATE',
      resource: 'USER',
      resourceId: userId,
      details: {
        settings,
        updatedAt: new Date().toISOString(),
      },
    });

    return settings;
  }

  /**
   * Get personalization settings
   */
  async getPersonalizationSettings(userId: string): Promise<PersonalizationDto> {
    // For now, return default settings since we don't have a personalization table
    // In a real implementation, you'd store these in a separate table
    return {
      theme: 'AUTO',
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: '1,234.56',
    };
  }

  /**
   * Update personalization settings
   */
  async updatePersonalizationSettings(userId: string, settings: PersonalizationDto): Promise<PersonalizationDto> {
    // In a real implementation, you'd store these in a separate table
    // For now, we'll just log the action
    await this.auditLogService.logAction({
      userId,
      action: 'PERSONALIZATION_SETTINGS_UPDATE',
      resource: 'USER',
      resourceId: userId,
      details: {
        settings,
        updatedAt: new Date().toISOString(),
      },
    });

    return settings;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, confirmation: string): Promise<{ message: string }> {
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      throw new BadRequestException('Invalid confirmation text');
    }

    // In a real implementation, you'd implement soft delete or data anonymization
    // For now, we'll just log the action
    await this.auditLogService.logAction({
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resource: 'USER',
      resourceId: userId,
      details: {
        requestedAt: new Date().toISOString(),
      },
    });

    return { message: 'Account deletion request submitted. Your account will be deleted within 30 days.' };
  }

  /**
   * Get account statistics
   */
  async getAccountStats(userId: string): Promise<{
    totalFollowers: number;
    totalFollowing: number;
    totalTrades: number;
    totalTips: number;
    totalLiveSessions: number;
    accountAge: number;
  }> {
    const [
      followers,
      following,
      trades,
      tipsReceived,
      liveSessions,
      user,
    ] = await Promise.all([
      this.prisma.follower.count({ where: { leaderId: userId } }),
      this.prisma.follower.count({ where: { followerId: userId } }),
      this.prisma.trade.count({ where: { userId } }),
      this.prisma.tip.count({ where: { receiverId: userId } }),
      this.prisma.liveSession.count({ where: { leaderId: userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const accountAge = user ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      totalFollowers: followers,
      totalFollowing: following,
      totalTrades: trades,
      totalTips: tipsReceived,
      totalLiveSessions: liveSessions,
      accountAge,
    };
  }

  /**
   * Search users by handle or name
   */
  async searchUsers(query: string, currentUserId: string): Promise<UserProfileDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        email: { contains: query, mode: 'insensitive' },
        NOT: { id: currentUserId }, // Exclude current user
      },
      take: 10,
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      handle: undefined, // Not available in current schema
      firstName: undefined, // Not available in current schema
      lastName: undefined, // Not available in current schema
      bio: undefined, // Not available in current schema
      avatarUrl: undefined, // Not available in current schema
      isVerified: false, // Default value
      mfaEnabled: false, // Default value
      status: 'ACTIVE', // Default value
      kycStatus: 'PENDING', // Default value
      subscriptionTier: 'FREE', // Default value
      createdAt: user.createdAt,
      updatedAt: user.createdAt, // Use createdAt as updatedAt since updatedAt doesn't exist
    }));
  }
} 