import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { NotificationService } from '../../lib/notification.service';

export interface SocialPost {
  id: string;
  userId: string;
  type: 'TRADE' | 'COMMENT' | 'LIVE_SESSION' | 'PORTFOLIO_UPDATE';
  content: string;
  metadata?: any;
  likes: number;
  comments: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  postId?: string;
  commentId?: string;
  userId: string;
  createdAt: Date;
}

@Injectable()
export class SocialFeedService implements OnModuleInit {
  private readonly logger = new Logger(SocialFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions() {
    // Subscribe to trade events to create social posts
    this.eventBus.subscribe('LeaderTradeFilled', async (event: any) => {
      await this.createTradePost(event);
    });

    // Subscribe to live session events
    this.eventBus.subscribe('LiveSessionStarted', async (event: any) => {
      await this.createLiveSessionPost(event);
    });
  }

  /**
   * Create a social post for a trade
   */
  private async createTradePost(event: any) {
    try {
      const { user_id: userId, trade } = event;

      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { handle: true },
      });

      if (!user) {
        return;
      }

      // Create trade post
      const post = await this.prisma.socialPost.create({
        data: {
          userId: userId,
          type: 'TRADE',
          content: `${user.handle} ${trade.side.toLowerCase()}ed ${trade.quantity} ${trade.symbol} @ $${trade.fill_price.toFixed(2)}`,
          metadata: {
            symbol: trade.symbol,
            side: trade.side,
            quantity: trade.quantity,
            fillPrice: trade.fill_price,
            accountNumber: trade.account_number,
          },
          likes: 0,
          comments: 0,
        },
      });

      this.logger.log(`Created trade post ${post.id} for user ${userId}`);
    } catch (error) {
      this.logger.error('Error creating trade post:', error);
    }
  }

  /**
   * Create a social post for live session
   */
  private async createLiveSessionPost(event: any) {
    try {
      const { sessionId, userId, title } = event;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { handle: true },
      });

      if (!user) {
        return;
      }

      const post = await this.prisma.socialPost.create({
        data: {
          userId: userId,
          type: 'LIVE_SESSION',
          content: `${user.handle} is now live: ${title}`,
          metadata: {
            sessionId: sessionId,
            title: title,
          },
          likes: 0,
          comments: 0,
        },
      });

      this.logger.log(`Created live session post ${post.id} for user ${userId}`);
    } catch (error) {
      this.logger.error('Error creating live session post:', error);
    }
  }

  /**
   * Get social feed for a user
   */
  async getFeed(userId: string, page: number = 1, limit: number = 20): Promise<SocialPost[]> {
    try {
      // Get users that the current user follows
      const following = await this.prisma.follower.findMany({
        where: { followerId: userId },
        select: { leaderId: true },
      });

      const followingIds = following.map(f => f.leaderId);

      // Get posts from followed users and the user themselves
      const posts = await this.prisma.socialPost.findMany({
        where: {
          userId: {
            in: [...followingIds, userId],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return posts.map(post => ({
        id: post.id,
        userId: post.userId,
        type: post.type,
        content: post.content,
        metadata: post.metadata,
        likes: post._count.likes,
        comments: post._count.comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: post.user,
      }));
    } catch (error) {
      this.logger.error('Error getting social feed:', error);
      throw error;
    }
  }

  /**
   * Create a comment on a post
   */
  async createComment(userId: string, postId: string, content: string): Promise<Comment> {
    try {
      // Validate content (profanity filter, length, etc.)
      const validatedContent = this.validateContent(content);
      
      const comment = await this.prisma.comment.create({
        data: {
          postId: postId,
          userId: userId,
          content: validatedContent,
          likes: 0,
        },
      });

      // Update post comment count
      await this.prisma.socialPost.update({
        where: { id: postId },
        data: {
          comments: {
            increment: 1,
          },
        },
      });

      // Notify post author
      await this.notifyPostAuthor(postId, userId, 'comment');

      this.logger.log(`Created comment ${comment.id} on post ${postId}`);
      return comment;
    } catch (error) {
      this.logger.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Like a post
   */
  async likePost(userId: string, postId: string): Promise<void> {
    try {
      // Check if already liked
      const existingLike = await this.prisma.like.findFirst({
        where: {
          postId: postId,
          userId: userId,
        },
      });

      if (existingLike) {
        // Unlike
        await this.prisma.like.delete({
          where: { id: existingLike.id },
        });

        await this.prisma.socialPost.update({
          where: { id: postId },
          data: {
            likes: {
              decrement: 1,
            },
          },
        });
      } else {
        // Like
        await this.prisma.like.create({
          data: {
            postId: postId,
            userId: userId,
          },
        });

        await this.prisma.socialPost.update({
          where: { id: postId },
          data: {
            likes: {
              increment: 1,
            },
          },
        });

        // Notify post author
        await this.notifyPostAuthor(postId, userId, 'like');
      }
    } catch (error) {
      this.logger.error('Error liking post:', error);
      throw error;
    }
  }

  /**
   * Like a comment
   */
  async likeComment(userId: string, commentId: string): Promise<void> {
    try {
      // Check if already liked
      const existingLike = await this.prisma.like.findFirst({
        where: {
          commentId: commentId,
          userId: userId,
        },
      });

      if (existingLike) {
        // Unlike
        await this.prisma.like.delete({
          where: { id: existingLike.id },
        });

        await this.prisma.comment.update({
          where: { id: commentId },
          data: {
            likes: {
              decrement: 1,
            },
          },
        });
      } else {
        // Like
        await this.prisma.like.create({
          data: {
            commentId: commentId,
            userId: userId,
          },
        });

        await this.prisma.comment.update({
          where: { id: commentId },
          data: {
            likes: {
              increment: 1,
            },
          },
        });
      }
    } catch (error) {
      this.logger.error('Error liking comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(postId: string, page: number = 1, limit: number = 10): Promise<Comment[]> {
    try {
      const comments = await this.prisma.comment.findMany({
        where: { postId: postId },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return comments;
    } catch (error) {
      this.logger.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Create a portfolio update post
   */
  async createPortfolioUpdate(userId: string, content: string, metadata?: any): Promise<SocialPost> {
    try {
      const validatedContent = this.validateContent(content);
      
      const post = await this.prisma.socialPost.create({
        data: {
          userId: userId,
          type: 'PORTFOLIO_UPDATE',
          content: validatedContent,
          metadata: metadata,
          likes: 0,
          comments: 0,
        },
      });

      this.logger.log(`Created portfolio update post ${post.id} for user ${userId}`);
      return post;
    } catch (error) {
      this.logger.error('Error creating portfolio update post:', error);
      throw error;
    }
  }

  /**
   * Validate content (profanity filter, length, etc.)
   */
  private validateContent(content: string): string {
    // Basic validation
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (content.length > 1000) {
      throw new Error('Content too long (max 1000 characters)');
    }

    // Simple profanity filter (in production, use a proper service)
    const profanityWords = ['badword1', 'badword2']; // Add actual profanity list
    const lowerContent = content.toLowerCase();
    
    for (const word of profanityWords) {
      if (lowerContent.includes(word)) {
        throw new Error('Content contains inappropriate language');
      }
    }

    return content.trim();
  }

  /**
   * Notify post author of interaction
   */
  private async notifyPostAuthor(postId: string, userId: string, action: 'like' | 'comment'): Promise<void> {
    try {
      const post = await this.prisma.socialPost.findUnique({
        where: { id: postId },
        include: {
          user: true,
        },
      });

      if (!post || post.userId === userId) {
        return; // Don't notify self
      }

      const actor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { handle: true },
      });

      if (!actor) {
        return;
      }

      const title = action === 'like' ? 'New like on your post' : 'New comment on your post';
      const body = action === 'like' 
        ? `${actor.handle} liked your post`
        : `${actor.handle} commented on your post`;

      await this.notificationService.sendPush(
        [post.user.deviceToken || ''],
        title,
        body,
        {
          type: 'SOCIAL_INTERACTION',
          postId: postId,
          action: action,
          actorId: userId,
        }
      );
    } catch (error) {
      this.logger.error('Error notifying post author:', error);
    }
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(limit: number = 10): Promise<SocialPost[]> {
    try {
      const posts = await this.prisma.socialPost.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: [
          { likes: 'desc' },
          { comments: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return posts.map(post => ({
        id: post.id,
        userId: post.userId,
        type: post.type,
        content: post.content,
        metadata: post.metadata,
        likes: post._count.likes,
        comments: post._count.comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: post.user,
      }));
    } catch (error) {
      this.logger.error('Error getting trending posts:', error);
      throw error;
    }
  }
} 