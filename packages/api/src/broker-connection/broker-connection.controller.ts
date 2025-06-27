import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, HttpCode, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BrokerConnectionService } from './broker-connection.service';
import { AuthGuard, AuthenticatedRequest } from '../lib/auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';

export class SnapTradeCallbackDto {
  @IsString()
  @IsNotEmpty()
  snaptrade_user_id!: string;

  @IsString()
  @IsNotEmpty()
  snaptrade_authorization_id!: string;
}

@Controller('connections')
export class BrokerConnectionController {
  constructor(private readonly brokerConnectionService: BrokerConnectionService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createAuthUrl(@Body('broker') broker: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brokerConnectionService.createAuthUrl(broker, req.user.id);
  }

  @Post('callback/snaptrade')
  @UseGuards(AuthGuard)
  async handleCallback(@Body() callbackData: { snaptrade_user_id: string; snaptrade_authorization_id: string }) {
    return this.brokerConnectionService.handleSnaptradeCallback(callbackData);
  }

  @Get()
  @UseGuards(AuthGuard)
  listConnections(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.brokerConnectionService.listByUser(req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async disconnect(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    try {
      await this.brokerConnectionService.disconnect(id, req.user.id);
      return { message: 'Connection revoked successfully' };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to disconnect broker');
    }
  }
} 