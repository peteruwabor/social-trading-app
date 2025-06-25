import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, HttpCode, NotFoundException } from '@nestjs/common';
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
    return this.brokerConnectionService.createAuthUrl(broker, req.user.id);
  }

  @Post('callback/snaptrade')
  @HttpCode(200)
  async handleSnaptradeCallback(@Body() dto: SnapTradeCallbackDto) {
    return this.brokerConnectionService.handleSnaptradeCallback(dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  listConnections(@Req() req: AuthenticatedRequest) {
    return this.brokerConnectionService.listByUser(req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async disconnect(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      await this.brokerConnectionService.disconnect(id, req.user.id);
      return { message: 'Connection revoked successfully' };
    } catch (error) {
      if (error instanceof Error) {
        throw new NotFoundException(error.message);
      }
      throw new NotFoundException('An unknown error occurred.');
    }
  }
} 