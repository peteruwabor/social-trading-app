import { Controller, Post, Body, HttpStatus, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService, SignupDto, LoginDto, AuthResponseDto } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('signup')
  @ApiOperation({
    summary: 'User signup',
    description: 'Registers a new user account',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid signup data',
  })
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  /**
   * Login user
   */
  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates user and returns JWT token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid login data',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Request password reset
   */
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Sends password reset email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email not found',
  })
  async forgotPassword(@Body() body: { email: string }): Promise<{ message: string }> {
    return this.authService.forgotPassword(body.email);
  }

  /**
   * Reset password
   */
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets password using reset token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() body: { token: string; password: string }): Promise<{ message: string }> {
    return this.authService.resetPassword(body.token, body.password);
  }

  /**
   * Verify email
   */
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email',
    description: 'Verifies user email with verification token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(@Body() body: { token: string }): Promise<{ message: string }> {
    return this.authService.verifyEmail(body.token);
  }
} 