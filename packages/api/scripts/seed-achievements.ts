import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const achievements = [
  // Onboarding Achievements
  {
    name: 'PROFILE_COMPLETE',
    description: 'Profile Builder',
    icon: '👤',
    category: 'MILESTONE',
    requirement: {
      type: 'profile_complete',
      description: 'Complete your profile with name and trading experience'
    }
  },
  {
    name: 'ONBOARDING_COMPLETE',
    description: 'Welcome Aboard',
    icon: '🎉',
    category: 'MILESTONE',
    requirement: {
      type: 'onboarding_complete',
      description: 'Complete the full onboarding process'
    }
  },

  // Social Achievements
  {
    name: 'FIRST_FOLLOW',
    description: 'Social Trader',
    icon: '👥',
    category: 'SOCIAL',
    requirement: {
      type: 'follow_count',
      count: 1,
      description: 'Follow your first trader'
    }
  },
  {
    name: 'SOCIAL_TRADER',
    description: 'Network Builder',
    icon: '🌐',
    category: 'SOCIAL',
    requirement: {
      type: 'follow_count',
      count: 10,
      description: 'Follow 10 traders'
    }
  },
  {
    name: 'NETWORK_BUILDER',
    description: 'Social Butterfly',
    icon: '🦋',
    category: 'SOCIAL',
    requirement: {
      type: 'follow_count',
      count: 50,
      description: 'Follow 50 traders'
    }
  },
  {
    name: 'FIRST_FOLLOWER',
    description: 'Gaining Trust',
    icon: '⭐',
    category: 'SOCIAL',
    requirement: {
      type: 'follower_count',
      count: 1,
      description: 'Gain your first follower'
    }
  },
  {
    name: 'INFLUENCER',
    description: 'Trading Influencer',
    icon: '🏆',
    category: 'SOCIAL',
    requirement: {
      type: 'follower_count',
      count: 100,
      description: 'Gain 100 followers'
    }
  },

  // Trading Achievements
  {
    name: 'FIRST_TRADE',
    description: 'Market Debut',
    icon: '📈',
    category: 'TRADING',
    requirement: {
      type: 'trade_count',
      count: 1,
      description: 'Execute your first trade'
    }
  },
  {
    name: 'ACTIVE_TRADER',
    description: 'Active Trader',
    icon: '💼',
    category: 'TRADING',
    requirement: {
      type: 'trade_count',
      count: 50,
      description: 'Execute 50 trades'
    }
  },
  {
    name: 'TRADING_VETERAN',
    description: 'Trading Veteran',
    icon: '🎖️',
    category: 'TRADING',
    requirement: {
      type: 'trade_count',
      count: 500,
      description: 'Execute 500 trades'
    }
  },
  {
    name: 'PROFITABLE_TRADER',
    description: 'Profit Maker',
    icon: '💰',
    category: 'PERFORMANCE',
    requirement: {
      type: 'positive_return',
      threshold: 0.1,
      description: 'Achieve 10% total return'
    }
  },
  {
    name: 'HIGH_PERFORMER',
    description: 'High Performer',
    icon: '🚀',
    category: 'PERFORMANCE',
    requirement: {
      type: 'win_rate',
      threshold: 0.7,
      min_trades: 20,
      description: 'Achieve 70% win rate with at least 20 trades'
    }
  },

  // Copy Trading Achievements
  {
    name: 'COPY_TRADER',
    description: 'Copy Trader',
    icon: '📋',
    category: 'TRADING',
    requirement: {
      type: 'copy_trade_count',
      count: 1,
      description: 'Execute your first copy trade'
    }
  },
  {
    name: 'COPY_MASTER',
    description: 'Copy Master',
    icon: '🎯',
    category: 'TRADING',
    requirement: {
      type: 'copy_trade_count',
      count: 100,
      description: 'Execute 100 copy trades'
    }
  },

  // Milestone Achievements
  {
    name: 'ONE_WEEK_ACTIVE',
    description: 'Weekly Warrior',
    icon: '📅',
    category: 'MILESTONE',
    requirement: {
      type: 'days_active',
      count: 7,
      description: 'Stay active for 7 days'
    }
  },
  {
    name: 'ONE_MONTH_ACTIVE',
    description: 'Monthly Champion',
    icon: '🗓️',
    category: 'MILESTONE',
    requirement: {
      type: 'days_active',
      count: 30,
      description: 'Stay active for 30 days'
    }
  },
  {
    name: 'PORTFOLIO_CONNECTED',
    description: 'Portfolio Connected',
    icon: '🔗',
    category: 'MILESTONE',
    requirement: {
      type: 'broker_connected',
      description: 'Connect your first broker account'
    }
  }
];

async function seedAchievements() {
  console.log('🌱 Seeding achievements...');

  for (const achievement of achievements) {
    try {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: achievement,
        create: achievement
      });
      console.log(`✅ Created/Updated achievement: ${achievement.name}`);
    } catch (error) {
      console.error(`❌ Error creating achievement ${achievement.name}:`, error);
    }
  }

  console.log('🎉 Achievement seeding completed!');
}

async function main() {
  try {
    await seedAchievements();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedAchievements }; 