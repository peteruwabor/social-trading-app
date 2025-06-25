import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
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

  @Post('broker-connections')
  async createBrokerConnection(
    @Req() req: AuthenticatedRequest,
    @Body() connectionData: {
      broker: string;
      accessToken: string;
      refreshToken: string;
      scope?: string;
    }
  ) {
    try {
      const connection = await this.prismaService.brokerConnection.create({
        data: {
          userId: req.user.id,
          ...connectionData,
        }
      });
      
      return {
        message: 'Broker connection created successfully',
        connection,
      };
    } catch (error) {
      return {
        message: 'Failed to create broker connection',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('broker-connections')
  async getBrokerConnections(@Req() req: AuthenticatedRequest) {
    try {
      const connections = await this.prismaService.brokerConnection.findMany({
        where: {
          userId: req.user.id,
        }
      });
      
      return {
        message: 'Broker connections retrieved successfully',
        connections,
      };
    } catch (error) {
      return {
        message: 'Failed to retrieve broker connections',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
} 