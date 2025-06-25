import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DemoController } from './demo.controller';
import { BrokerConnectionModule } from './broker-connection/broker-connection.module';
import { PortfolioSyncModule } from './portfolio-sync/portfolio-sync.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TradeCaptureModule } from './trade-capture/trade-capture.module';
import { FollowerAlertModule } from './follower-alert/follower-alert.module';
import { FollowerModule } from './modules/followers/follower.module';
import { CopyEngineModule } from './modules/copy-engine/copy-engine.module';
import { CopyTradingModule } from './modules/copy-trading/copy-trading.module';
import { AdvancedCopyTradingModule } from './modules/copy-engine/advanced-copy-trading.module';
import { LibModule } from './lib/event-bus';
import { PrismaService } from './lib/prisma.service';
import { NotificationModule } from './modules/notifications/notification.module';
import { LiveSessionModule } from './modules/live-session/live-session.module';
import { TipModule } from './modules/tip/tip.module';
import { AdminActionModule } from './modules/admin/admin-action.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { UserModule } from './modules/user/user.module';
import { APIKeyModule } from './modules/api-key/api-key.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { PlatformIntegrationsModule } from './modules/platform-integrations/platform-integrations.module';
import { DelayedCopyModule } from './modules/delayed-copy/delayed-copy.module';
import { SocialFeedModule } from './modules/social-feed/social-feed.module';
import { BacktestingModule } from './modules/backtesting/backtesting.module';
import { TaxExportModule } from './modules/tax-export/tax-export.module';

@Module({
  imports: [
    BrokerConnectionModule,
    PortfolioSyncModule,
    PortfolioModule,
    TradeCaptureModule,
    FollowerAlertModule,
    FollowerModule,
    CopyEngineModule,
    CopyTradingModule,
    AdvancedCopyTradingModule,
    LibModule,
    NotificationModule,
    LiveSessionModule,
    TipModule,
    AdminActionModule,
    AnalyticsModule,
    AuditLogModule,
    ComplianceModule,
    UserModule,
    APIKeyModule,
    WebhookModule,
    RealtimeModule,
    MobileModule,
    PlatformIntegrationsModule,
    DelayedCopyModule,
    SocialFeedModule,
    BacktestingModule,
    TaxExportModule,
  ],
  controllers: [AppController, DemoController],
  providers: [AppService, Reflector, PrismaService],
  exports: [Reflector, PrismaService],
})
export class AppModule {} 