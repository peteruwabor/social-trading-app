import { Controller, Get, Put, Post, Delete, Body, Request, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { UserService, UserProfileDto, UpdateProfileDto, ChangePasswordDto, PrivacySettingsDto, NotificationSettingsDto, PersonalizationDto } from './user.service';

@ApiTags('User Profile & Settings')
@Controller('user')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current user profile
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieves the current user\'s profile information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getProfile(@Request() req: any): Promise<UserProfileDto> {
    return this.userService.getUserProfile(req.user.id);
  }

  /**
   * Update user profile
   */
  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates the current user\'s profile information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid profile data or handle already taken',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updateProfile(
    @Request() req: any,
    @Body() updateData: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.userService.updateProfile(req.user.id, updateData);
  }

  /**
   * Change user password
   */
  @Post('password')
  @ApiOperation({
    summary: 'Change password',
    description: 'Changes the current user\'s password',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid password data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async changePassword(
    @Request() req: any,
    @Body() passwordData: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.userService.changePassword(req.user.id, passwordData);
  }

  /**
   * Enable MFA
   */
  @Post('mfa/enable')
  @ApiOperation({
    summary: 'Enable MFA',
    description: 'Enables multi-factor authentication for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA enabled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'MFA already enabled',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async enableMFA(@Request() req: any): Promise<{ secret: string; qrCode: string }> {
    return this.userService.enableMFA(req.user.id);
  }

  /**
   * Disable MFA
   */
  @Post('mfa/disable')
  @ApiOperation({
    summary: 'Disable MFA',
    description: 'Disables multi-factor authentication for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA disabled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'MFA not enabled',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async disableMFA(@Request() req: any): Promise<{ message: string }> {
    return this.userService.disableMFA(req.user.id);
  }

  /**
   * Get privacy settings
   */
  @Get('privacy')
  @ApiOperation({
    summary: 'Get privacy settings',
    description: 'Retrieves the current user\'s privacy settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Privacy settings retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getPrivacySettings(@Request() req: any): Promise<PrivacySettingsDto> {
    return this.userService.getPrivacySettings(req.user.id);
  }

  /**
   * Update privacy settings
   */
  @Put('privacy')
  @ApiOperation({
    summary: 'Update privacy settings',
    description: 'Updates the current user\'s privacy settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Privacy settings updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updatePrivacySettings(
    @Request() req: any,
    @Body() settings: PrivacySettingsDto,
  ): Promise<PrivacySettingsDto> {
    return this.userService.updatePrivacySettings(req.user.id, settings);
  }

  /**
   * Get notification settings
   */
  @Get('notifications')
  @ApiOperation({
    summary: 'Get notification settings',
    description: 'Retrieves the current user\'s notification settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification settings retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getNotificationSettings(@Request() req: any): Promise<NotificationSettingsDto> {
    return this.userService.getNotificationSettings(req.user.id);
  }

  /**
   * Update notification settings
   */
  @Put('notifications')
  @ApiOperation({
    summary: 'Update notification settings',
    description: 'Updates the current user\'s notification settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification settings updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() settings: NotificationSettingsDto,
  ): Promise<NotificationSettingsDto> {
    return this.userService.updateNotificationSettings(req.user.id, settings);
  }

  /**
   * Get personalization settings
   */
  @Get('personalization')
  @ApiOperation({
    summary: 'Get personalization settings',
    description: 'Retrieves the current user\'s personalization settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Personalization settings retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getPersonalizationSettings(@Request() req: any): Promise<PersonalizationDto> {
    return this.userService.getPersonalizationSettings(req.user.id);
  }

  /**
   * Update personalization settings
   */
  @Put('personalization')
  @ApiOperation({
    summary: 'Update personalization settings',
    description: 'Updates the current user\'s personalization settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Personalization settings updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updatePersonalizationSettings(
    @Request() req: any,
    @Body() settings: PersonalizationDto,
  ): Promise<PersonalizationDto> {
    return this.userService.updatePersonalizationSettings(req.user.id, settings);
  }

  /**
   * Get account statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get account statistics',
    description: 'Retrieves statistics for the current user\'s account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getAccountStats(@Request() req: any): Promise<{
    totalFollowers: number;
    totalFollowing: number;
    totalTrades: number;
    totalTips: number;
    totalLiveSessions: number;
    accountAge: number;
  }> {
    return this.userService.getAccountStats(req.user.id);
  }

  /**
   * Search users
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search users',
    description: 'Searches for users by handle or name',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users found successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async searchUsers(
    @Request() req: any,
    @Query('q') query: string,
  ): Promise<UserProfileDto[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.userService.searchUsers(query.trim(), req.user.id);
  }

  /**
   * Delete account
   */
  @Delete('account')
  @ApiOperation({
    summary: 'Delete account',
    description: 'Requests deletion of the current user\'s account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account deletion requested successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid confirmation text',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async deleteAccount(
    @Request() req: any,
    @Body() body: { confirmation: string },
  ): Promise<{ message: string }> {
    return this.userService.deleteAccount(req.user.id, body.confirmation);
  }
} 