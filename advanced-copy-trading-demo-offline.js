#!/usr/bin/env node

/**
 * GIOAT Advanced Copy Trading Demo (Offline Version)
 * 
 * This script demonstrates the new Epic J features without requiring the API server:
 * - Kelly Criterion Algorithm
 * - Risk Parity Portfolio Allocation
 * - Momentum-Based Trading Strategies
 * - Advanced Risk Management
 * - Performance Analytics
 */

// Mock data for demonstration
const MOCK_DATA = {
    strategies: [
        {
            id: 'strategy-1',
            name: 'Kelly Criterion Conservative',
            algorithm: 'KELLY_CRITERION',
            riskLevel: 'LOW',
            maxPositionSize: 0.05,
            stopLoss: 0.02,
            takeProfit: 0.06,
            isActive: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'strategy-2',
            name: 'Risk Parity Balanced',
            algorithm: 'RISK_PARITY',
            riskLevel: 'MEDIUM',
            maxPositionSize: 0.10,
            stopLoss: 0.03,
            takeProfit: 0.09,
            isActive: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'strategy-3',
            name: 'Momentum Aggressive',
            algorithm: 'MOMENTUM_BASED',
            riskLevel: 'HIGH',
            maxPositionSize: 0.15,
            stopLoss: 0.05,
            takeProfit: 0.12,
            isActive: true,
            createdAt: new Date().toISOString()
        }
    ],
    performance: {
        totalReturn: 0.156,
        sharpeRatio: 1.85,
        maxDrawdown: -0.08,
        winRate: 0.68,
        strategyPerformance: [
            { name: 'Kelly Criterion Conservative', return: 0.142, sharpeRatio: 1.92, maxDrawdown: -0.06 },
            { name: 'Risk Parity Balanced', return: 0.168, sharpeRatio: 1.78, maxDrawdown: -0.09 },
            { name: 'Momentum Aggressive', return: 0.189, sharpeRatio: 1.65, maxDrawdown: -0.12 }
        ]
    },
    riskMetrics: {
        volatility: 0.145,
        var95: 0.085,
        cvar: 0.112,
        beta: 0.92,
        alerts: [
            { type: 'POSITION_SIZE', message: 'Momentum strategy approaching max position size limit' },
            { type: 'VOLATILITY', message: 'Portfolio volatility within acceptable range' }
        ]
    },
    marketData: {
        sp500: { price: 4850.25, change: 0.023, momentum: 0.08 },
        nasdaq: { price: 15250.75, change: 0.035, momentum: 0.12 },
        russell: { price: 1850.50, change: -0.008, momentum: -0.03 },
        gold: { price: 2150.00, change: 0.015, momentum: 0.05 }
    }
};

class AdvancedCopyTradingOfflineDemo {
    constructor() {
        this.strategies = MOCK_DATA.strategies;
        this.performance = MOCK_DATA.performance;
        this.riskMetrics = MOCK_DATA.riskMetrics;
        this.marketData = MOCK_DATA.marketData;
    }

    async start() {
        console.log('\n🚀 GIOAT Advanced Copy Trading Demo (Offline)');
        console.log('==============================================\n');
        
        await this.runDemo();
    }

    async runDemo() {
        console.log('🎯 Running Advanced Copy Trading Demo...\n');
        
        // Demo 1: Strategy Management
        await this.demoStrategyManagement();
        
        // Demo 2: Kelly Criterion Algorithm
        await this.demoKellyCriterion();
        
        // Demo 3: Risk Parity Algorithm
        await this.demoRiskParity();
        
        // Demo 4: Momentum-Based Algorithm
        await this.demoMomentumBased();
        
        // Demo 5: Performance Analytics
        await this.demoPerformanceAnalytics();
        
        // Demo 6: Risk Management
        await this.demoRiskManagement();
        
        // Demo 7: Strategy Execution
        await this.demoStrategyExecution();
        
        // Demo 8: Real-time Market Analysis
        await this.demoRealTimeAnalysis();
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   • ${this.strategies.length} strategies demonstrated`);
        console.log(`   • 3 algorithmic approaches showcased`);
        console.log(`   • Real-time performance tracking`);
        console.log(`   • Advanced risk management features`);
        console.log(`   • Live market data integration`);
        
        console.log('\n🔗 To see the full interactive demo:');
        console.log('   Open frontend-demo.html in your browser');
        console.log('\n🚀 To run with live API:');
        console.log('   Start the API server: cd packages/api && pnpm run dev');
        console.log('   Then run: node advanced-copy-trading-demo.js');
    }

    async demoStrategyManagement() {
        console.log('📋 1. Strategy Management Demo');
        console.log('   ----------------------------');
        
        console.log(`   📊 Total strategies: ${this.strategies.length}`);
        this.strategies.forEach(strategy => {
            console.log(`   • ${strategy.name} (${strategy.algorithm}) - ${strategy.riskLevel} risk`);
        });
        
        // Simulate strategy update
        const strategyToUpdate = this.strategies[0];
        strategyToUpdate.maxPositionSize = 0.08;
        strategyToUpdate.stopLoss = 0.025;
        console.log(`   ✅ Updated strategy: ${strategyToUpdate.name}`);
        console.log(`   📊 New max position size: ${(strategyToUpdate.maxPositionSize * 100).toFixed(1)}%`);
        console.log(`   🛡️  New stop loss: ${(strategyToUpdate.stopLoss * 100).toFixed(2)}%`);
        
        console.log('');
    }

    async demoKellyCriterion() {
        console.log('🎯 2. Kelly Criterion Algorithm Demo');
        console.log('   ---------------------------------');
        
        const kellyStrategy = this.strategies.find(s => s.algorithm === 'KELLY_CRITERION');
        if (kellyStrategy) {
            console.log(`   📈 Strategy: ${kellyStrategy.name}`);
            console.log(`   🎲 Win Rate: 68%`);
            console.log(`   💰 Average Win: 6%`);
            console.log(`   📉 Average Loss: 2%`);
            
            // Calculate Kelly percentage
            const winRate = 0.68;
            const avgWin = 0.06;
            const avgLoss = 0.02;
            const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
            
            console.log(`   🧮 Kelly Percentage: ${(kellyPercent * 100).toFixed(2)}%`);
            console.log(`   📊 Recommended Position Size: ${Math.min(kellyPercent, kellyStrategy.maxPositionSize) * 100}%`);
            console.log(`   🛡️  Risk Management: Stop Loss at ${kellyStrategy.stopLoss * 100}%`);
            console.log(`   🎯 Take Profit Target: ${kellyStrategy.takeProfit * 100}%`);
            
            // Show Kelly Criterion formula
            console.log(`   📐 Formula: f* = (bp - q) / b`);
            console.log(`   📐 Where: b = odds received, p = win probability, q = loss probability`);
        }
        
        console.log('');
    }

    async demoRiskParity() {
        console.log('⚖️  3. Risk Parity Algorithm Demo');
        console.log('   ------------------------------');
        
        const riskParityStrategy = this.strategies.find(s => s.algorithm === 'RISK_PARITY');
        if (riskParityStrategy) {
            console.log(`   📈 Strategy: ${riskParityStrategy.name}`);
            
            // Simulate portfolio allocation
            const assets = [
                { name: 'SPY', volatility: 0.15, weight: 0.25, price: this.marketData.sp500.price },
                { name: 'QQQ', volatility: 0.20, weight: 0.25, price: this.marketData.nasdaq.price },
                { name: 'IWM', volatility: 0.25, weight: 0.25, price: this.marketData.russell.price },
                { name: 'GLD', volatility: 0.18, weight: 0.25, price: this.marketData.gold.price }
            ];
            
            console.log(`   📊 Portfolio Allocation:`);
            assets.forEach(asset => {
                const riskContribution = asset.weight * asset.volatility;
                console.log(`   • ${asset.name}: ${(asset.weight * 100).toFixed(1)}% weight, ${(riskContribution * 100).toFixed(2)}% risk contribution`);
            });
            
            const totalRisk = assets.reduce((sum, asset) => sum + asset.weight * asset.volatility, 0);
            console.log(`   🎯 Total Portfolio Risk: ${(totalRisk * 100).toFixed(2)}%`);
            console.log(`   ⚖️  Equal Risk Contribution: ${(totalRisk / assets.length * 100).toFixed(2)}% per asset`);
            
            // Show risk parity optimization
            console.log(`   🔧 Risk Parity Optimization:`);
            console.log(`   • Target: Equal risk contribution across all assets`);
            console.log(`   • Method: Volatility-weighted allocation`);
            console.log(`   • Rebalancing: Monthly or when risk contribution deviates >5%`);
        }
        
        console.log('');
    }

    async demoMomentumBased() {
        console.log('📈 4. Momentum-Based Algorithm Demo');
        console.log('   --------------------------------');
        
        const momentumStrategy = this.strategies.find(s => s.algorithm === 'MOMENTUM_BASED');
        if (momentumStrategy) {
            console.log(`   📈 Strategy: ${momentumStrategy.name}`);
            
            // Use real market data for momentum signals
            const momentumSignals = [
                { asset: 'SPY', momentum: this.marketData.sp500.momentum, signal: this.marketData.sp500.momentum > 0 ? 'BUY' : 'SELL', strength: Math.abs(this.marketData.sp500.momentum) > 0.1 ? 'VERY_STRONG' : Math.abs(this.marketData.sp500.momentum) > 0.05 ? 'STRONG' : 'WEAK' },
                { asset: 'QQQ', momentum: this.marketData.nasdaq.momentum, signal: this.marketData.nasdaq.momentum > 0 ? 'BUY' : 'SELL', strength: Math.abs(this.marketData.nasdaq.momentum) > 0.1 ? 'VERY_STRONG' : Math.abs(this.marketData.nasdaq.momentum) > 0.05 ? 'STRONG' : 'WEAK' },
                { asset: 'IWM', momentum: this.marketData.russell.momentum, signal: this.marketData.russell.momentum > 0 ? 'BUY' : 'SELL', strength: Math.abs(this.marketData.russell.momentum) > 0.1 ? 'VERY_STRONG' : Math.abs(this.marketData.russell.momentum) > 0.05 ? 'STRONG' : 'WEAK' },
                { asset: 'GLD', momentum: this.marketData.gold.momentum, signal: this.marketData.gold.momentum > 0 ? 'BUY' : 'SELL', strength: Math.abs(this.marketData.gold.momentum) > 0.1 ? 'VERY_STRONG' : Math.abs(this.marketData.gold.momentum) > 0.05 ? 'STRONG' : 'WEAK' }
            ];
            
            console.log(`   📊 Momentum Signals (Real-time):`);
            momentumSignals.forEach(signal => {
                const emoji = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '🟡';
                console.log(`   ${emoji} ${signal.asset}: ${signal.signal} (${signal.strength}) - ${(signal.momentum * 100).toFixed(1)}% momentum`);
            });
            
            // Calculate position sizes based on momentum
            const totalMomentum = momentumSignals
                .filter(s => s.signal === 'BUY')
                .reduce((sum, s) => sum + Math.abs(s.momentum), 0);
            
            console.log(`   🎯 Total Positive Momentum: ${(totalMomentum * 100).toFixed(1)}%`);
            console.log(`   📊 Dynamic Position Sizing: Based on momentum strength`);
            
            // Show momentum calculation
            console.log(`   📐 Momentum Calculation:`);
            console.log(`   • Timeframe: 20-day moving average`);
            console.log(`   • Signal: Price vs moving average crossover`);
            console.log(`   • Strength: Rate of change and volume confirmation`);
        }
        
        console.log('');
    }

    async demoPerformanceAnalytics() {
        console.log('📊 5. Performance Analytics Demo');
        console.log('   -----------------------------');
        
        console.log(`   📈 Overall Performance:`);
        console.log(`   • Total Return: ${(this.performance.totalReturn * 100).toFixed(2)}%`);
        console.log(`   • Sharpe Ratio: ${this.performance.sharpeRatio.toFixed(2)}`);
        console.log(`   • Max Drawdown: ${(this.performance.maxDrawdown * 100).toFixed(2)}%`);
        console.log(`   • Win Rate: ${(this.performance.winRate * 100).toFixed(1)}%`);
        
        console.log(`   📊 Strategy Performance:`);
        this.performance.strategyPerformance.forEach(strategy => {
            console.log(`   • ${strategy.name}: ${(strategy.return * 100).toFixed(2)}% return, ${strategy.sharpeRatio.toFixed(2)} Sharpe, ${(strategy.maxDrawdown * 100).toFixed(2)}% max DD`);
        });
        
        // Show performance metrics explanation
        console.log(`   📐 Performance Metrics:`);
        console.log(`   • Sharpe Ratio: Risk-adjusted return measure`);
        console.log(`   • Max Drawdown: Largest peak-to-trough decline`);
        console.log(`   • Win Rate: Percentage of profitable trades`);
        console.log(`   • Total Return: Cumulative performance over time`);
        
        console.log('');
    }

    async demoRiskManagement() {
        console.log('🛡️  6. Risk Management Demo');
        console.log('   ------------------------');
        
        console.log(`   🎯 Risk Metrics:`);
        console.log(`   • Portfolio Volatility: ${(this.riskMetrics.volatility * 100).toFixed(2)}%`);
        console.log(`   • Value at Risk (95%): ${(this.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.log(`   • Conditional VaR: ${(this.riskMetrics.cvar * 100).toFixed(2)}%`);
        console.log(`   • Beta: ${this.riskMetrics.beta.toFixed(2)}`);
        
        console.log(`   🚨 Risk Alerts:`);
        if (this.riskMetrics.alerts.length > 0) {
            this.riskMetrics.alerts.forEach(alert => {
                console.log(`   • ${alert.type}: ${alert.message}`);
            });
        } else {
            console.log(`   • No active risk alerts`);
        }
        
        // Show risk management features
        console.log(`   🛡️  Risk Management Features:`);
        console.log(`   • Position Size Limits: Maximum allocation per trade`);
        console.log(`   • Stop Loss Orders: Automatic loss protection`);
        console.log(`   • Take Profit Targets: Profit-taking automation`);
        console.log(`   • Portfolio Heat Maps: Visual risk concentration`);
        console.log(`   • Real-time Monitoring: Continuous risk assessment`);
        
        console.log('');
    }

    async demoStrategyExecution() {
        console.log('⚡ 7. Strategy Execution Demo');
        console.log('   -------------------------');
        
        const strategyToExecute = this.strategies[0];
        const executionData = {
            strategyId: strategyToExecute.id,
            amount: 10000,
            brokerAccountId: 'demo-account-123',
            executeAt: new Date().toISOString()
        };
        
        console.log(`   🚀 Executing: ${strategyToExecute.name}`);
        console.log(`   💰 Amount: $${executionData.amount.toLocaleString()}`);
        console.log(`   📊 Execution ID: ${Date.now()}`);
        console.log(`   ⏰ Status: PENDING_EXECUTION`);
        
        // Simulate trade generation
        const trades = [
            { symbol: 'SPY', side: 'BUY', quantity: 20, price: this.marketData.sp500.price },
            { symbol: 'QQQ', side: 'BUY', quantity: 15, price: this.marketData.nasdaq.price },
            { symbol: 'GLD', side: 'BUY', quantity: 8, price: this.marketData.gold.price }
        ];
        
        console.log(`   📈 Generated Trades:`);
        trades.forEach(trade => {
            console.log(`   • ${trade.symbol}: ${trade.side} ${trade.quantity} @ $${trade.price.toFixed(2)}`);
        });
        
        console.log(`   ✅ Execution completed successfully`);
        
        console.log('');
    }

    async demoRealTimeAnalysis() {
        console.log('🔄 8. Real-time Market Analysis Demo');
        console.log('   ---------------------------------');
        
        console.log(`   📊 Live Market Data:`);
        console.log(`   • SPY: $${this.marketData.sp500.price.toFixed(2)} (${(this.marketData.sp500.change * 100).toFixed(2)}%)`);
        console.log(`   • QQQ: $${this.marketData.nasdaq.price.toFixed(2)} (${(this.marketData.nasdaq.change * 100).toFixed(2)}%)`);
        console.log(`   • IWM: $${this.marketData.russell.price.toFixed(2)} (${(this.marketData.russell.change * 100).toFixed(2)}%)`);
        console.log(`   • GLD: $${this.marketData.gold.price.toFixed(2)} (${(this.marketData.gold.change * 100).toFixed(2)}%)`);
        
        // Market sentiment analysis
        const positiveAssets = Object.values(this.marketData).filter(asset => asset.change > 0).length;
        const totalAssets = Object.keys(this.marketData).length;
        const marketSentiment = positiveAssets / totalAssets;
        
        console.log(`   🎯 Market Sentiment: ${(marketSentiment * 100).toFixed(0)}% bullish (${positiveAssets}/${totalAssets} assets positive)`);
        
        // Strategy recommendations
        console.log(`   💡 Strategy Recommendations:`);
        if (marketSentiment > 0.75) {
            console.log(`   • High bullish sentiment - Consider momentum strategies`);
        } else if (marketSentiment < 0.25) {
            console.log(`   • High bearish sentiment - Consider defensive strategies`);
        } else {
            console.log(`   • Mixed sentiment - Consider balanced risk parity approach`);
        }
        
        console.log(`   🔄 Real-time Features:`);
        console.log(`   • Live price feeds from multiple exchanges`);
        console.log(`   • Real-time strategy rebalancing`);
        console.log(`   • Instant trade execution`);
        console.log(`   • Live performance monitoring`);
        console.log(`   • Real-time risk alerts`);
        
        console.log('');
    }
}

// Run the demo
if (require.main === module) {
    const demo = new AdvancedCopyTradingOfflineDemo();
    demo.start().catch(console.error);
}

module.exports = AdvancedCopyTradingOfflineDemo; 