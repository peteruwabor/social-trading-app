import { Controller, Get, Post, Delete, Body, Request, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { APIKeyService, APIKeyCreateDto } from './api-key.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('api-keys')
@ApiTags('API Keys')
@UseGuards(AuthGuard)
export class APIKeyController {
  constructor(private readonly apiKeyService: APIKeyService) {}

  @Post()
  @ApiOperation({
    summary: 'Create API key',
    description: 'Creates a new API key for the authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async createAPIKey(
    @Request() req: any,
    @Body() dto: APIKeyCreateDto,
  ) {
    if (!dto.scopes || !Array.isArray(dto.scopes) || dto.scopes.length === 0) {
      throw new BadRequestException('At least one scope is required');
    }

    return this.apiKeyService.createAPIKey(req.user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List API keys',
    description: 'Lists all API keys for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'API keys retrieved successfully',
  })
  async listAPIKeys(@Request() req: any) {
    return this.apiKeyService.listAPIKeys(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Revoke API key',
    description: 'Revokes an API key (marks it as inactive)',
  })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'API key not found',
  })
  async revokeAPIKey(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    try {
      await this.apiKeyService.revokeAPIKey(req.user.id, id);
      return { message: 'API key revoked successfully' };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get API key statistics',
    description: 'Retrieves usage statistics for all API keys',
  })
  @ApiResponse({
    status: 200,
    description: 'API key statistics retrieved successfully',
  })
  async getAPIKeyStats(@Request() req: any) {
    return this.apiKeyService.getAPIKeyStats(req.user.id);
  }
} 