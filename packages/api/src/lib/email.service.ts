import { Injectable, Logger } from '@nestjs/common';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // For now, we'll log the email content
      // In production, integrate with SendGrid, AWS SES, or similar service
      this.logger.log(`📧 Email would be sent to: ${template.to}`);
      this.logger.log(`📧 Subject: ${template.subject}`);
      this.logger.log(`📧 Content: ${template.html}`);
      
      // TODO: Replace with actual email service
      // Example with SendGrid:
      // const msg = {
      //   to: template.to,
      //   from: process.env.FROM_EMAIL,
      //   subject: template.subject,
      //   html: template.html,
      //   text: template.text,
      // };
      // await sgMail.send(msg);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${template.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/auth/verify-email?token=${token}`;
    
    const template: EmailTemplate = {
      to: email,
      subject: '🚀 Verify your GIOAT account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your GIOAT Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Welcome to GIOAT!</h1>
              <p>Your Social Trading Platform</p>
            </div>
            <div class="content">
              <h2>Hi ${name}! 👋</h2>
              <p>Thank you for joining GIOAT, the premier social trading platform. You're now part of a community of successful traders!</p>
              
              <p>To get started and access all features, please verify your email address:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">✅ Verify My Email</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">
                ${verificationUrl}
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <h3>🚀 What's Next?</h3>
              <ul>
                <li><strong>Complete your profile</strong> - Add your trading experience and preferences</li>
                <li><strong>Connect your broker</strong> - Link your trading account for seamless copy trading</li>
                <li><strong>Follow top traders</strong> - Discover and copy successful trading strategies</li>
                <li><strong>Start trading</strong> - Begin your social trading journey</li>
              </ul>
              
              <p>If you didn't create this account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 GIOAT - Social Trading Platform</p>
              <p>This link will expire in 24 hours for security reasons.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to GIOAT! Please verify your email by visiting: ${verificationUrl}`
    };

    return this.sendEmail(template);
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/auth/reset-password?token=${token}`;
    
    const template: EmailTemplate = {
      to: email,
      subject: '🔐 Reset your GIOAT password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your GIOAT Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
              <p>GIOAT Social Trading Platform</p>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              <p>We received a request to reset your password for your GIOAT account.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is still secure.
              </div>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">🔑 Reset My Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <p><strong>This link will expire in 1 hour</strong> for security reasons.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <h3>🛡️ Security Tips:</h3>
              <ul>
                <li>Choose a strong, unique password</li>
                <li>Don't share your password with anyone</li>
                <li>Enable two-factor authentication when available</li>
                <li>Log out when using shared computers</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 GIOAT - Social Trading Platform</p>
              <p>Need help? Contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Reset your GIOAT password by visiting: ${resetUrl} (expires in 1 hour)`
    };

    return this.sendEmail(template);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}`;
    
    const template: EmailTemplate = {
      to: email,
      subject: '🎉 Welcome to GIOAT - Let\'s start trading!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to GIOAT</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Verified!</h1>
              <p>Welcome to GIOAT Social Trading</p>
            </div>
            <div class="content">
              <h2>Congratulations ${name}! 🚀</h2>
              <p>Your email has been verified and your GIOAT account is now fully active. You're ready to start your social trading journey!</p>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">🎯 Go to Dashboard</a>
              </div>
              
              <h3>🔥 What You Can Do Now:</h3>
              
              <div class="feature">
                <h4>📊 Follow Top Traders</h4>
                <p>Discover successful traders and automatically copy their strategies with customizable risk settings.</p>
              </div>
              
              <div class="feature">
                <h4>💼 Portfolio Management</h4>
                <p>Track your performance in real-time with detailed analytics and portfolio insights.</p>
              </div>
              
              <div class="feature">
                <h4>🔗 Connect Your Broker</h4>
                <p>Link your trading account for seamless trade execution and portfolio synchronization.</p>
              </div>
              
              <div class="feature">
                <h4>📱 Real-time Notifications</h4>
                <p>Stay updated with instant alerts on trades, followers, and market opportunities.</p>
              </div>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <h3>🎯 Quick Start Guide:</h3>
              <ol>
                <li><strong>Complete your profile</strong> - Add your trading experience and goals</li>
                <li><strong>Browse traders</strong> - Explore our community of successful traders</li>
                <li><strong>Start following</strong> - Choose traders that match your strategy</li>
                <li><strong>Monitor performance</strong> - Track your portfolio growth</li>
              </ol>
              
              <p>Ready to revolutionize your trading experience? Let's get started!</p>
            </div>
            <div class="footer">
              <p>© 2024 GIOAT - Social Trading Platform</p>
              <p>Happy trading! 📈</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to GIOAT! Your account is verified. Start trading at: ${dashboardUrl}`
    };

    return this.sendEmail(template);
  }
} 