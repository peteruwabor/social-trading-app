import { Controller, Get, Post, Body, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './lib/prisma.service';
import { AuthGuard, AuthenticatedRequest } from './lib/auth.guard';

@Controller('demo')
@UseGuards(AuthGuard)
export class DemoController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('user')
  async getCurrentUser(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Current user info',
      user: req.user,
    };
  }

  @Post('users')
  async createUser(@Body() userData: { email: string }) {
    try {
      const user = await this.prismaService.user.create({
        data: {
          email: userData.email,
        }
      });
      
      return {
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      return {
        message: 'Failed to create user',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('users')
  async getUsers() {
    try {
      const users = await this.prismaService.user.findMany();
      
      return {
        message: 'Users retrieved successfully',
        users,
      };
    } catch (error) {
      return {
        message: 'Failed to retrieve users',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('connect-broker')
  async connectBroker(
    @Body() connectionData: any,
    @Req() req: AuthenticatedRequest
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const connection = await this.prismaService.brokerConnection.create({
        data: {
          userId: req.user.id,
          ...connectionData,
        }
      });
      return connection;
    } catch (error) {
      throw new Error('Failed to connect broker');
    }
  }

  @Post('list-connections')
  async listConnections(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const connections = await this.prismaService.brokerConnection.findMany({
        where: {
          userId: req.user.id,
        }
      });
      return connections;
    } catch (error) {
      throw new Error('Failed to list connections');
    }
  }
} 
} 