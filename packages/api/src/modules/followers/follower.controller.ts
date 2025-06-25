import { Controller, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { FollowerService } from './follower.service';
import { AuthGuard } from '../../lib/auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('followers')
@UseGuards(AuthGuard)
export class FollowerController {
  constructor(private readonly followerService: FollowerService) {}

  @Patch(':leaderId/auto-copy')
  async setAutoCopy(
    @Param('leaderId') leaderId: string,
    @Body() body: { enabled: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    const followerId = req.user.id;
    
    const result = await this.followerService.setAutoCopy(
      leaderId,
      followerId,
      body.enabled,
    );

    return {
      message: `Auto-copy ${body.enabled ? 'enabled' : 'disabled'} for leader ${leaderId}`,
      follower: {
        id: result.id,
        leaderId: result.leaderId,
        followerId: result.followerId,
        autoCopy: result.autoCopy,
        alertOnly: result.alertOnly,
      },
    };
  }
} 