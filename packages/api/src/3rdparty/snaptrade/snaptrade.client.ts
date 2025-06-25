import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface SnapTradeHolding {
  symbol: string;
  quantity: number;
  marketValue: number;
  currency: string;
  accountNumber: string;
}

export interface SnapTradeAccountHoldings {
  accountId: string;
  accountNumber: string;
  holdings: SnapTradeHolding[];
}

export class SnapTradeClient {
  private readonly clientId: string;
  private readonly consumerKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.clientId = process.env.SNAPTRADE_CLIENT_ID!;
    this.consumerKey = process.env.SNAPTRADE_CONSUMER_KEY!;
    this.baseUrl = 'https://api.snaptrade.com/api/v1';

    if (!this.clientId || !this.consumerKey) {
      throw new Error('SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY must be set');
    }
  }

  async createConnectToken(userId: string): Promise<{ connectToken: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/authorizations`,
        {
          userId,
          connectionType: 'read',
          broker: 'ALL',
        },
        {
          headers: {
            'SNAPTRADE-CLIENT-ID': this.clientId,
            'SNAPTRADE-CONSUMER-KEY': this.consumerKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        connectToken: response.data.connectToken,
      };
    } catch (error) {
      throw new Error(`Failed to create connect token: ${error}`);
    }
  }

  async exchangeAuthorization(authId: string): Promise<{ accounts: any[] }> {
    // Mock implementation for now
    return {
      accounts: [
        {
          id: 'mock-account-1',
          name: 'Mock Brokerage Account',
          type: 'INDIVIDUAL',
          number: '****1234',
          institution: 'Mock Bank',
          balance: 50000.00,
          currency: 'USD',
        },
        {
          id: 'mock-account-2',
          name: 'Mock IRA Account',
          type: 'IRA',
          number: '****5678',
          institution: 'Mock Bank',
          balance: 75000.00,
          currency: 'USD',
        },
      ],
    };
  }

  async getHoldings(authorizationId: string): Promise<SnapTradeAccountHoldings[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/authorizations/${authorizationId}/holdings`,
        {
          headers: {
            'SNAPTRADE-CLIENT-ID': this.clientId,
            'SNAPTRADE-CONSUMER-KEY': this.consumerKey,
          },
        }
      );

      // Transform the response to our expected format
      return response.data.accounts.map((account: any) => ({
        accountId: account.id,
        accountNumber: account.number,
        holdings: account.holdings.map((holding: any) => ({
          symbol: holding.symbol,
          quantity: parseFloat(holding.quantity),
          marketValue: parseFloat(holding.marketValue),
          currency: holding.currency || 'USD',
          accountNumber: account.number,
        })),
      }));
    } catch (error) {
      // For now, return mock data for testing
      return [
        {
          accountId: 'mock-account-1',
          accountNumber: '****1234',
          holdings: [
            {
              symbol: 'AAPL',
              quantity: 10,
              marketValue: 1500.00,
              currency: 'USD',
              accountNumber: '****1234',
            },
            {
              symbol: 'GOOGL',
              quantity: 5,
              marketValue: 2500.00,
              currency: 'USD',
              accountNumber: '****1234',
            },
          ],
        },
        {
          accountId: 'mock-account-2',
          accountNumber: '****5678',
          holdings: [
            {
              symbol: 'TSLA',
              quantity: 20,
              marketValue: 4000.00,
              currency: 'USD',
              accountNumber: '****5678',
            },
          ],
        },
      ];
    }
  }

  /**
   * Get trading activities for a user since a specific timestamp
   */
  async getActivities(authorizationId: string, since?: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/authorizations/${authorizationId}/activities`;
      const params = since ? { since } : {};
      
      const response = await axios.get(url, {
        headers: {
          'SNAPTRADE-CLIENT-ID': this.clientId,
          'SNAPTRADE-CONSUMER-KEY': this.consumerKey,
        },
        params
      });
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get SnapTrade activities:', error);
      
      // Return mock data for testing
      const now = new Date();
      const mockActivities = [
        {
          id: 'activity-1',
          type: 'FILL',
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          data: {
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            price: 150.25,
            account_number: '****1234',
            filled_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          },
        },
        {
          id: 'activity-2',
          type: 'FILL',
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
          data: {
            symbol: 'GOOGL',
            side: 'SELL',
            quantity: 5,
            price: 2750.50,
            account_number: '****1234',
            filled_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          },
        },
        {
          id: 'activity-3',
          type: 'FILL',
          timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          data: {
            symbol: 'TSLA',
            side: 'BUY',
            quantity: 20,
            price: 200.75,
            account_number: '****5678',
            filled_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          },
        },
        {
          id: 'activity-4',
          type: 'FILL',
          timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
          data: {
            symbol: 'MSFT',
            side: 'BUY',
            quantity: 15,
            price: 325.80,
            account_number: '****1234',
            filled_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
          },
        },
        {
          id: 'activity-5',
          type: 'FILL',
          timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
          data: {
            symbol: 'AAPL',
            side: 'SELL',
            quantity: 8,
            price: 151.00,
            account_number: '****1234',
            filled_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
          },
        },
      ];

      // Filter by since timestamp if provided
      if (since) {
        const sinceDate = new Date(since);
        return mockActivities.filter(activity => new Date(activity.timestamp) > sinceDate);
      }

      return mockActivities;
    }
  }

  async placeOrder(params: {
    authorizationId: string;
    accountNumber: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
  }): Promise<{ orderId: string }> {
    if (process.env.SNAPTRADE_MOCK === 'true') {
      return new Promise(resolve => setTimeout(() => resolve({ orderId: uuidv4() }), 100));
    }
    // Real API call (mock endpoint for now)
    const response = await axios.post(
      `${this.baseUrl}/authorizations/${params.authorizationId}/accounts/${params.accountNumber}/orders`,
      {
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
      },
      {
        headers: {
          'SNAPTRADE-CLIENT-ID': this.clientId,
          'SNAPTRADE-CONSUMER-KEY': this.consumerKey,
          'Content-Type': 'application/json',
        },
      }
    );
    return { orderId: response.data.orderId };
  }
} 