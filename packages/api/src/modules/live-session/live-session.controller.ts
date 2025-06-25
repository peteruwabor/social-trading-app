import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, HttpStatus, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { LiveSessionService, LiveSessionCreateDto, LiveSessionUpdateDto } from './live-session.service';

export class CreateSessionDto {
  title?: string;
}

export class UpdateSessionDto {
  title?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ENDED';
}

export class SessionResponseDto {
  id!: string;
  leaderId!: string;
  title!: string;
  status!: string;
  startedAt!: Date;
  endedAt?: Date;
  viewerCount!: number;
  leader!: {
    id: string;
    email: string;
    handle?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

export class SessionStatsDto {
  totalSessions!: number;
  totalViewers!: number;
  averageSessionDuration!: number;
  mostPopularSessions!: any[];
}

@ApiTags('Live Sessions')
@Controller('live-sessions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class LiveSessionController {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  /**
   * Create a new live trading session
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create live session',
    description: 'Creates a new live trading session for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Live session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async createSession(
    @Request() req: any,
    @Body() createDto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    const session = await this.liveSessionService.createSession({
      leaderId: req.user.id,
      title: createDto.title,
    });

    return {
      id: session.id,
      leaderId: session.leaderId,
      title: session.title!,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      viewerCount: session.viewerCount,
      leader: {
        id: session.leader.id,
        email: session.leader.email,
        handle: session.leader.handle || undefined,
        firstName: session.leader.firstName || undefined,
        lastName: session.leader.lastName || undefined,
        avatarUrl: session.leader.avatarUrl || undefined,
      },
    };
  }

  /**
   * Get all active live sessions
   */
  @Get()
  @ApiOperation({
    summary: 'Get active sessions',
    description: 'Retrieves all currently active live trading sessions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active sessions retrieved successfully',
    type: [SessionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getActiveSessions(): Promise<SessionResponseDto[]> {
    const sessions = await this.liveSessionService.getActiveSessions();

    return sessions.map(session => ({
      id: session.id,
      leaderId: session.leaderId,
      title: session.title!,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      viewerCount: session.viewerCount,
      leader: {
        id: session.leader.id,
        email: session.leader.email,
        handle: session.leader.handle || undefined,
        firstName: session.leader.firstName || undefined,
        lastName: session.leader.lastName || undefined,
        avatarUrl: session.leader.avatarUrl || undefined,
      },
    }));
  }

  /**
   * Get a specific live session
   */
  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get session details',
    description: 'Retrieves detailed information about a specific live session',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session details retrieved successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getSession(@Param('sessionId') sessionId: string): Promise<any> {
    const session = await this.liveSessionService.getSession(sessionId);

    return {
      id: session.id,
      leaderId: session.leaderId,
      title: session.title!,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      viewerCount: session.viewerCount,
      leader: {
        id: session.leader.id,
        email: session.leader.email,
        handle: session.leader.handle || undefined,
        firstName: session.leader.firstName || undefined,
        lastName: session.leader.lastName || undefined,
        avatarUrl: session.leader.avatarUrl || undefined,
      },
      viewers: session.viewers?.map(viewer => ({
        id: viewer.id,
        viewerId: viewer.viewerId,
        joinedAt: viewer.joinedAt,
        leftAt: viewer.leftAt,
        viewer: {
          id: viewer.viewer.id,
          email: viewer.viewer.email,
          handle: viewer.viewer.handle || undefined,
          firstName: viewer.viewer.firstName || undefined,
          lastName: viewer.viewer.lastName || undefined,
          avatarUrl: viewer.viewer.avatarUrl || undefined,
        },
      })) || [],
    };
  }

  /**
   * Update a live session
   */
  @Put(':sessionId')
  @ApiOperation({
    summary: 'Update session',
    description: 'Updates a live session (only the session leader can update)',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not authorized to update this session',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updateSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateSessionDto,
  ): Promise<SessionResponseDto> {
    const session = await this.liveSessionService.getSession(sessionId);

    // Check if user is the session leader
    if (session.leaderId !== req.user.id) {
      throw new Error('Not authorized to update this session');
    }

    const updatedSession = await this.liveSessionService.updateSession(sessionId, updateDto);

    return {
      id: updatedSession.id,
      leaderId: updatedSession.leaderId,
      title: updatedSession.title!,
      status: updatedSession.status,
      startedAt: updatedSession.startedAt,
      endedAt: updatedSession.endedAt || undefined,
      viewerCount: updatedSession.viewerCount,
      leader: {
        id: updatedSession.leader.id,
        email: updatedSession.leader.email,
        handle: updatedSession.leader.handle || undefined,
        firstName: updatedSession.leader.firstName || undefined,
        lastName: updatedSession.leader.lastName || undefined,
        avatarUrl: updatedSession.leader.avatarUrl || undefined,
      },
    };
  }

  /**
   * Join a live session
   */
  @Post(':sessionId/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join session',
    description: 'Joins a live session as a viewer',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully joined session',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Session is not active',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async joinSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    await this.liveSessionService.joinSession(sessionId, req.user.id);
    return { message: 'Successfully joined session' };
  }

  /**
   * Leave a live session
   */
  @Post(':sessionId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Leave session',
    description: 'Leaves a live session',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully left session',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async leaveSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    await this.liveSessionService.leaveSession(sessionId, req.user.id);
    return { message: 'Successfully left session' };
  }

  /**
   * Get session statistics for a leader
   */
  @Get('stats/leader/:leaderId')
  @ApiOperation({
    summary: 'Get leader session stats',
    description: 'Retrieves live session statistics for a specific leader',
  })
  @ApiParam({ name: 'leaderId', description: 'Leader user ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session statistics retrieved successfully',
    type: SessionStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getLeaderStats(
    @Param('leaderId') leaderId: string,
    @Query('days') days?: number,
  ): Promise<SessionStatsDto> {
    const stats = await this.liveSessionService.getSessionStats(leaderId, days || 30);

    return {
      totalSessions: stats.totalSessions,
      totalViewers: stats.totalViewers,
      averageSessionDuration: stats.averageSessionDuration,
      mostPopularSessions: stats.mostPopularSessions,
    };
  }

  /**
   * Get my session statistics
   */
  @Get('stats/my')
  @ApiOperation({
    summary: 'Get my session stats',
    description: 'Retrieves live session statistics for the authenticated user',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session statistics retrieved successfully',
    type: SessionStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getMyStats(
    @Request() req: any,
    @Query('days') days?: number,
  ): Promise<SessionStatsDto> {
    const stats = await this.liveSessionService.getSessionStats(req.user.id, days || 30);

    return {
      totalSessions: stats.totalSessions,
      totalViewers: stats.totalViewers,
      averageSessionDuration: stats.averageSessionDuration,
      mostPopularSessions: stats.mostPopularSessions,
    };
  }
} 