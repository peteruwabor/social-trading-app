#!/usr/bin/env node

/**
 * GIOAT Advanced Copy Trading Demo
 * 
 * This script demonstrates the new Epic J features:
 * - Kelly Criterion Algorithm
 * - Risk Parity Portfolio Allocation
 * - Momentum-Based Trading Strategies
 * - Advanced Risk Management
 * - Performance Analytics
 */

const axios = require('axios');

// Demo configuration
const DEMO_CONFIG = {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'X-Test-User': 'demo-user-123' // For demo purposes
    }
};

// Demo data
const DEMO_DATA = {
    users: [
        {
            id: 'user-1',
            email: 'trader1@demo.com',
            handle: 'pro_trader_1',
            portfolio: 50000
        },
        {
            id: 'user-2', 
            email: 'trader2@demo.com',
            handle: 'momentum_master',
            portfolio: 75000
        },
        {
            id: 'user-3',
            email: 'trader3@demo.com',
            handle: 'risk_parity_expert',
            portfolio: 100000
        }
    ],
    strategies: [
        {
            name: 'Kelly Criterion Conservative',
            algorithm: 'KELLY_CRITERION',
            riskLevel: 'LOW',
            maxPositionSize: 0.05,
            stopLoss: 0.02,
            takeProfit: 0.06
        },
        {
            name: 'Risk Parity Balanced',
            algorithm: 'RISK_PARITY',
            riskLevel: 'MEDIUM',
            maxPositionSize: 0.10,
            stopLoss: 0.03,
            takeProfit: 0.09
        },
        {
            name: 'Momentum Aggressive',
            algorithm: 'MOMENTUM_BASED',
            riskLevel: 'HIGH',
            maxPositionSize: 0.15,
            stopLoss: 0.05,
            takeProfit: 0.12
        }
    ]
};

class AdvancedCopyTradingDemo {
    constructor() {
        this.api = axios.create(DEMO_CONFIG);
        this.currentUser = null;
        this.strategies = [];
        this.performance = null;
    }

    async start() {
        console.log('\n🚀 GIOAT Advanced Copy Trading Demo');
        console.log('=====================================\n');
        
        try {
            await this.setupDemo();
            await this.runDemo();
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }

    async setupDemo() {
        console.log('📋 Setting up demo environment...');
        
        // Simulate user authentication
        this.currentUser = DEMO_DATA.users[0];
        console.log(`✅ Logged in as: ${this.currentUser.handle}`);
        
        // Create demo strategies
        await this.createDemoStrategies();
        
        console.log('✅ Demo environment ready!\n');
    }

    async createDemoStrategies() {
        console.log('🔧 Creating demo strategies...');
        
        for (const strategyData of DEMO_DATA.strategies) {
            try {
                const response = await this.api.post('/advanced-copy-trading/strategy', {
                    name: strategyData.name,
                    algorithm: strategyData.algorithm,
                    riskLevel: strategyData.riskLevel,
                    maxPositionSize: strategyData.maxPositionSize,
                    stopLoss: strategyData.stopLoss,
                    takeProfit: strategyData.takeProfit,
                    isActive: true
                });
                
                this.strategies.push(response.data);
                console.log(`  ✅ Created: ${strategyData.name}`);
            } catch (error) {
                console.log(`  ⚠️  Strategy creation failed: ${strategyData.name}`);
            }
        }
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
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   • ${this.strategies.length} strategies created`);
        console.log(`   • 3 algorithmic approaches demonstrated`);
        console.log(`   • Real-time performance tracking`);
        console.log(`   • Advanced risk management features`);
    }

    async demoStrategyManagement() {
        console.log('📋 1. Strategy Management Demo');
        console.log('   ----------------------------');
        
        try {
            // Get all strategies
            const response = await this.api.get('/advanced-copy-trading/strategies');
            const strategies = response.data;
            
            console.log(`   📊 Total strategies: ${strategies.length}`);
            strategies.forEach(strategy => {
                console.log(`   • ${strategy.name} (${strategy.algorithm}) - ${strategy.riskLevel} risk`);
            });
            
            // Update a strategy
            if (strategies.length > 0) {
                const strategyToUpdate = strategies[0];
                await this.api.put(`/advanced-copy-trading/strategy/${strategyToUpdate.id}`, {
                    maxPositionSize: 0.08,
                    stopLoss: 0.025
                });
                console.log(`   ✅ Updated strategy: ${strategyToUpdate.name}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Strategy management failed: ${error.message}`);
        }
        
        console.log('');
    }

    async demoKellyCriterion() {
        console.log('🎯 2. Kelly Criterion Algorithm Demo');
        console.log('   ---------------------------------');
        
        try {
            // Simulate Kelly Criterion calculation
            const kellyStrategy = this.strategies.find(s => s.algorithm === 'KELLY_CRITERION');
            if (kellyStrategy) {
                console.log(`   📈 Strategy: ${kellyStrategy.name}`);
                console.log(`   🎲 Win Rate: 65%`);
                console.log(`   💰 Average Win: 6%`);
                console.log(`   📉 Average Loss: 2%`);
                
                // Calculate Kelly percentage
                const winRate = 0.65;
                const avgWin = 0.06;
                const avgLoss = 0.02;
                const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
                
                console.log(`   🧮 Kelly Percentage: ${(kellyPercent * 100).toFixed(2)}%`);
                console.log(`   📊 Recommended Position Size: ${Math.min(kellyPercent, kellyStrategy.maxPositionSize) * 100}%`);
                console.log(`   🛡️  Risk Management: Stop Loss at ${kellyStrategy.stopLoss * 100}%`);
            }
            
        } catch (error) {
            console.log(`   ❌ Kelly Criterion demo failed: ${error.message}`);
        }
        
        console.log('');
    }

    async demoRiskParity() {
        console.log('⚖️  3. Risk Parity Algorithm Demo');
        console.log('   ------------------------------');
        
        try {
            const riskParityStrategy = this.strategies.find(s => s.algorithm === 'RISK_PARITY');
            if (riskParityStrategy) {
                console.log(`   📈 Strategy: ${riskParityStrategy.name}`);
                
                // Simulate portfolio allocation
                const assets = [
                    { name: 'SPY', volatility: 0.15, weight: 0.25 },
                    { name: 'QQQ', volatility: 0.20, weight: 0.25 },
                    { name: 'IWM', volatility: 0.25, weight: 0.25 },
                    { name: 'GLD', volatility: 0.18, weight: 0.25 }
                ];
                
                console.log(`   📊 Portfolio Allocation:`);
                assets.forEach(asset => {
                    const riskContribution = asset.weight * asset.volatility;
                    console.log(`   • ${asset.name}: ${(asset.weight * 100).toFixed(1)}% weight, ${(riskContribution * 100).toFixed(2)}% risk contribution`);
                });
                
                const totalRisk = assets.reduce((sum, asset) => sum + asset.weight * asset.volatility, 0);
                console.log(`   🎯 Total Portfolio Risk: ${(totalRisk * 100).toFixed(2)}%`);
                console.log(`   ⚖️  Equal Risk Contribution: ${(totalRisk / assets.length * 100).toFixed(2)}% per asset`);
            }
            
        } catch (error) {
            console.log(`   ❌ Risk Parity demo failed: ${error.message}`);
        }
        
        console.log('');
    }

    async demoMomentumBased() {
        console.log('📈 4. Momentum-Based Algorithm Demo');
        console.log('   --------------------------------');
        
        try {
            const momentumStrategy = this.strategies.find(s => s.algorithm === 'MOMENTUM_BASED');
            if (momentumStrategy) {
                console.log(`   📈 Strategy: ${momentumStrategy.name}`);
                
                // Simulate momentum signals
                const momentumSignals = [
                    { asset: 'SPY', momentum: 0.08, signal: 'BUY', strength: 'STRONG' },
                    { asset: 'QQQ', momentum: 0.12, signal: 'BUY', strength: 'VERY_STRONG' },
                    { asset: 'IWM', momentum: -0.03, signal: 'SELL', strength: 'WEAK' },
                    { asset: 'GLD', momentum: 0.05, signal: 'HOLD', strength: 'NEUTRAL' }
                ];
                
                console.log(`   📊 Momentum Signals:`);
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
            }
            
        } catch (error) {
            console.log(`   ❌ Momentum demo failed: ${error.message}`);
        }
        
        console.log('');
    }

    async demoPerformanceAnalytics() {
        console.log('📊 5. Performance Analytics Demo');
        console.log('   -----------------------------');
        
        try {
            const response = await this.api.get('/advanced-copy-trading/performance');
            this.performance = response.data;
            
            console.log(`   📈 Overall Performance:`);
            console.log(`   • Total Return: ${(this.performance.totalReturn * 100).toFixed(2)}%`);
            console.log(`   • Sharpe Ratio: ${this.performance.sharpeRatio.toFixed(2)}`);
            console.log(`   • Max Drawdown: ${(this.performance.maxDrawdown * 100).toFixed(2)}%`);
            console.log(`   • Win Rate: ${(this.performance.winRate * 100).toFixed(1)}%`);
            
            console.log(`   📊 Strategy Performance:`);
            this.performance.strategyPerformance.forEach(strategy => {
                console.log(`   • ${strategy.name}: ${(strategy.return * 100).toFixed(2)}% return, ${strategy.sharpeRatio.toFixed(2)} Sharpe`);
            });
            
        } catch (error) {
            console.log(`   ❌ Performance analytics failed: ${error.message}`);
        }
        
        console.log('');
    }

    async demoRiskManagement() {
        console.log('🛡️  6. Risk Management Demo');
        console.log('   ------------------------');
        
        try {
            const response = await this.api.get('/advanced-copy-trading/risk-metrics');
            const riskMetrics = response.data;
            
            console.log(`   🎯 Risk Metrics:`);
            console.log(`   • Portfolio Volatility: ${(riskMetrics.volatility * 100).toFixed(2)}%`);
            console.log(`   • Value at Risk (95%): ${(riskMetrics.var95 * 100).toFixed(2)}%`);
            console.log(`   • Conditional VaR: ${(riskMetrics.cvar * 100).toFixed(2)}%`);
            console.log(`   • Beta: ${riskMetrics.beta.toFixed(2)}`);
            
            console.log(`   🚨 Risk Alerts:`);
            if (riskMetrics.alerts.length > 0) {
                riskMetrics.alerts.forEach(alert => {
                    console.log(`   • ${alert.type}: ${alert.message}`);
                });
            } else {
                console.log(`   • No active risk alerts`);
            }
            
        } catch (error) {
            console.log(`   ❌ Risk management demo failed: ${error.message}`);
        }
        
        console.log('');
    }

    async demoStrategyExecution() {
        console.log('⚡ 7. Strategy Execution Demo');
        console.log('   -------------------------');
        
        try {
            // Execute a strategy
            const strategyToExecute = this.strategies[0];
            const executionData = {
                strategyId: strategyToExecute.id,
                amount: 10000,
                brokerAccountId: 'demo-account-123',
                executeAt: new Date().toISOString()
            };
            
            const response = await this.api.post('/advanced-copy-trading/execute', executionData);
            const execution = response.data;
            
            console.log(`   🚀 Executing: ${strategyToExecute.name}`);
            console.log(`   💰 Amount: $${executionData.amount.toLocaleString()}`);
            console.log(`   📊 Execution ID: ${execution.id}`);
            console.log(`   ⏰ Status: ${execution.status}`);
            
            if (execution.trades && execution.trades.length > 0) {
                console.log(`   📈 Generated Trades:`);
                execution.trades.forEach(trade => {
                    console.log(`   • ${trade.symbol}: ${trade.side} ${trade.quantity} @ $${trade.price}`);
                });
            }
            
        } catch (error) {
            console.log(`   ❌ Strategy execution failed: ${error.message}`);
        }
        
        console.log('');
    }
}

// Run the demo
if (require.main === module) {
    const demo = new AdvancedCopyTradingDemo();
    demo.start().catch(console.error);
}

module.exports = AdvancedCopyTradingDemo; 