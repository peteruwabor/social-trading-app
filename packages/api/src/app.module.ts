import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './lib/prisma.service';
import { EventBus } from './lib/event-bus';
import { AuditLogModule } from './lib/audit-log.module';
import { AuthGuard } from './lib/auth.guard';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SocialModule } from './modules/social/social.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { UserModule } from './modules/user/user.module';
import { BrokerConnectionModule } from './broker-connection/broker-connection.module';
import { TradeCaptureModule } from './trade-capture/trade-capture.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { FollowerModule } from './modules/followers/follower.module';
import { CopyTradingModule } from './modules/copy-trading/copy-trading.module';
import { LiveSessionModule } from './modules/live-session/live-session.module';

// Temporarily comment out all other modules
// import { AnalyticsModule } from './modules/analytics/analytics.module';
// import { ApiKeyModule } from './modules/api-key/api-key.module';
// import { BacktestingModule } from './modules/backtesting/backtesting.module';
// import { ComplianceModule } from './modules/compliance/compliance.module';
// import { DelayedCopyModule } from './modules/delayed-copy/delayed-copy.module';
// import { MobileModule } from './modules/mobile/mobile.module';
// import { PlatformIntegrationsModule } from './modules/platform-integrations/platform-integrations.module';
// import { SocialFeedModule } from './modules/social-feed/social-feed.module';
// import { TaxExportModule } from './modules/tax-export/tax-export.module';
// import { TipModule } from './modules/tip/tip.module';
// import { WebhookModule } from './modules/webhook/webhook.module';
// import { AdminActionModule } from './modules/admin/admin-action.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    OnboardingModule,
    SocialModule,
    NotificationModule,
    UserModule,
    BrokerConnectionModule,
    TradeCaptureModule,
    PortfolioModule,
    FollowerModule,
    CopyTradingModule,
    LiveSessionModule,
    // Temporarily commented out
    // AnalyticsModule,
    // ApiKeyModule,
    // BacktestingModule,
    // ComplianceModule,
    // DelayedCopyModule,
    // MobileModule,
    // PlatformIntegrationsModule,
    // SocialFeedModule,
    // TaxExportModule,
    // TipModule,
    // WebhookModule,
    // AdminActionModule,
  ],
  controllers: [AppController],
  providers: [AppService, EventBus, AuthGuard],
})
export class AppModule {} 