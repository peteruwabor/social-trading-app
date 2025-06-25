import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { SocialFeedService } from './social-feed.service';

export class CreateCommentDto {
  content!: string;
}

export class CreatePortfolioUpdateDto {
  content!: string;
  metadata?: any;
}

export class SocialPostDto {
  id!: string;
  userId!: string;
  type!: string;
  content!: string;
  metadata?: any;
  likes!: number;
  comments!: number;
  createdAt!: Date;
  updatedAt!: Date;
  user?: {
    id: string;
    handle: string;
    avatarUrl?: string;
  };
}

export class CommentDto {
  id!: string;
  postId!: string;
  userId!: string;
  content!: string;
  likes!: number;
  createdAt!: Date;
  updatedAt!: Date;
  user?: {
    id: string;
    handle: string;
    avatarUrl?: string;
  };
}

@Controller('social-feed')
@ApiTags('Social Feed')
@UseGuards(AuthGuard)
export class SocialFeedController {
  constructor(private readonly socialFeedService: SocialFeedService) {}

  /**
   * Get social feed for the authenticated user
   */
  @Get()
  @ApiOperation({
    summary: 'Get social feed',
    description: 'Retrieve social feed posts from followed users',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social feed retrieved successfully',
    type: [SocialPostDto],
  })
  async getFeed(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<SocialPostDto[]> {
    return this.socialFeedService.getFeed(req.user.id, page, limit);
  }

  /**
   * Get trending posts
   */
  @Get('trending')
  @ApiOperation({
    summary: 'Get trending posts',
    description: 'Retrieve trending posts from the last 24 hours',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending posts retrieved successfully',
    type: [SocialPostDto],
  })
  async getTrendingPosts(
    @Query('limit') limit: number = 10,
  ): Promise<SocialPostDto[]> {
    return this.socialFeedService.getTrendingPosts(limit);
  }

  /**
   * Create a comment on a post
   */
  @Post('posts/:postId/comments')
  @ApiOperation({
    summary: 'Create comment',
    description: 'Create a comment on a social post',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment created successfully',
    type: CommentDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid comment content',
  })
  async createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ): Promise<CommentDto> {
    return this.socialFeedService.createComment(req.user.id, postId, dto.content);
  }

  /**
   * Get comments for a post
   */
  @Get('posts/:postId/comments')
  @ApiOperation({
    summary: 'Get post comments',
    description: 'Retrieve comments for a specific post',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments retrieved successfully',
    type: [CommentDto],
  })
  async getComments(
    @Param('postId') postId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<CommentDto[]> {
    return this.socialFeedService.getComments(postId, page, limit);
  }

  /**
   * Like a post
   */
  @Post('posts/:postId/like')
  @ApiOperation({
    summary: 'Like post',
    description: 'Like or unlike a social post',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post liked/unliked successfully',
  })
  async likePost(
    @Param('postId') postId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.socialFeedService.likePost(req.user.id, postId);
    return { message: 'Post liked successfully' };
  }

  /**
   * Like a comment
   */
  @Post('comments/:commentId/like')
  @ApiOperation({
    summary: 'Like comment',
    description: 'Like or unlike a comment',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment liked/unliked successfully',
  })
  async likeComment(
    @Param('commentId') commentId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.socialFeedService.likeComment(req.user.id, commentId);
    return { message: 'Comment liked successfully' };
  }

  /**
   * Create a portfolio update post
   */
  @Post('portfolio-update')
  @ApiOperation({
    summary: 'Create portfolio update',
    description: 'Create a portfolio update post',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Portfolio update created successfully',
    type: SocialPostDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid post content',
  })
  async createPortfolioUpdate(
    @Body() dto: CreatePortfolioUpdateDto,
    @Request() req: any,
  ): Promise<SocialPostDto> {
    return this.socialFeedService.createPortfolioUpdate(req.user.id, dto.content, dto.metadata);
  }

  /**
   * Get posts by user
   */
  @Get('users/:userId/posts')
  @ApiOperation({
    summary: 'Get user posts',
    description: 'Retrieve posts by a specific user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User posts retrieved successfully',
    type: [SocialPostDto],
  })
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<SocialPostDto[]> {
    // This would need to be implemented in the service
    // For now, return empty array
    return [];
  }

  /**
   * Get posts by type
   */
  @Get('type/:type')
  @ApiOperation({
    summary: 'Get posts by type',
    description: 'Retrieve posts filtered by type (TRADE, LIVE_SESSION, PORTFOLIO_UPDATE)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Posts retrieved successfully',
    type: [SocialPostDto],
  })
  async getPostsByType(
    @Param('type') type: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<SocialPostDto[]> {
    // This would need to be implemented in the service
    // For now, return empty array
    return [];
  }
} 