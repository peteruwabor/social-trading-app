import { Controller, Post, Body, Request, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { TipService } from './tip.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('tips')
export class TipController {
  constructor(private readonly tipService: TipService) {}

  @Post()
  @UseGuards(AuthGuard)
  async sendTip(@Request() req: any, @Body() body: { receiverId: string; amount: number; message?: string }) {
    if (!body.receiverId || typeof body.amount !== 'number') {
      throw new BadRequestException('receiverId and amount are required');
    }
    return this.tipService.sendTip(req.user.id, body.receiverId, body.amount, body.message);
  }

  @Get('history')
  @UseGuards(AuthGuard)
  async getTipHistory(@Request() req: any) {
    return this.tipService.getTipHistory(req.user.id);
  }

  @Get('earnings')
  @UseGuards(AuthGuard)
  async getEarnings(@Request() req: any) {
    return this.tipService.getEarnings(req.user.id);
  }
} 