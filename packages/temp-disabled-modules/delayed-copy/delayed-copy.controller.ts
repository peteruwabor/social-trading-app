import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { DelayedCopyService } from '../copy-engine/delayed-copy.service';

export class EnableDelayedCopyDto {
  leaderId!: string;
}

export class DelayedCopyOrderDto {
  id!: string;
  followerId!: string;
  leaderId!: string;
  symbol!: string;
  side!: string;
  quantity!: number;
  originalTradeId!: string;
  scheduledFor!: Date;
  status!: string;
  executedAt?: Date;
  errorMessage?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

@Controller('delayed-copy')
@ApiTags('Delayed Copy Trading')
@UseGuards(AuthGuard)
export class DelayedCopyController {
  constructor(private readonly delayedCopyService: DelayedCopyService) {}

  /**
   * Enable delayed copy for a leader
   */
  @Post('enable')
  @ApiOperation({
    summary: 'Enable delayed copy trading',
    description: 'Enable delayed copy trading for a specific leader (trades executed at end-of-day)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delayed copy enabled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async enableDelayedCopy(
    @Body() dto: EnableDelayedCopyDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.delayedCopyService.enableDelayedCopy(req.user.id, dto.leaderId);
    return { message: 'Delayed copy enabled successfully' };
  }

  /**
   * Disable delayed copy for a leader
   */
  @Post('disable')
  @ApiOperation({
    summary: 'Disable delayed copy trading',
    description: 'Disable delayed copy trading for a specific leader',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delayed copy disabled successfully',
  })
  async disableDelayedCopy(
    @Body() dto: EnableDelayedCopyDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.delayedCopyService.disableDelayedCopy(req.user.id, dto.leaderId);
    return { message: 'Delayed copy disabled successfully' };
  }

  /**
   * Get delayed copy orders for the authenticated user
   */
  @Get('orders')
  @ApiOperation({
    summary: 'Get delayed copy orders',
    description: 'Retrieve all delayed copy orders for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delayed copy orders retrieved successfully',
    type: [DelayedCopyOrderDto],
  })
  async getDelayedCopyOrders(@Request() req: any): Promise<DelayedCopyOrderDto[]> {
    return this.delayedCopyService.getDelayedCopyOrders(req.user.id);
  }

  /**
   * Get delayed copy orders for a specific leader
   */
  @Get('orders/:leaderId')
  @ApiOperation({
    summary: 'Get delayed copy orders for leader',
    description: 'Retrieve delayed copy orders for a specific leader',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delayed copy orders retrieved successfully',
    type: [DelayedCopyOrderDto],
  })
  async getDelayedCopyOrdersForLeader(
    @Param('leaderId') leaderId: string,
    @Request() req: any,
  ): Promise<DelayedCopyOrderDto[]> {
    const orders = await this.delayedCopyService.getDelayedCopyOrders(req.user.id);
    return orders.filter(order => order.leaderId === leaderId);
  }
} 