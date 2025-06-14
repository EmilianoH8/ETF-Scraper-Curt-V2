import axios from 'axios';
import { FREDSeries, DashboardData, TreasuryYield, YieldSpread, PolicyRate, MarketIndicator, CreditSpread, YieldCurvePoint, APIError } from '../types/bonds';

const API_BASE_URL = 'http://localhost:3001/api';

// FRED Series IDs
export const FRED_SERIES = {
  DGS2: '2-Year Treasury',
  DGS10: '10-Year Treasury', 
  DGS30: '30-Year Treasury',
  T10Y2Y: '10Y-2Y Spread',
  FEDFUNDS: 'Fed Funds Rate',
  SOFR: 'SOFR',
  SP500: 'S&P 500',
  VIXCLS: 'VIX',
  DTWEXBGS: 'Dollar Index',
  BAMLH0A0HYM2: 'High Yield Spreads',
  BAMLC0A0CM: 'Investment Grade Spreads',
  DGS3MO: '3-Month Treasury',
  DGS6MO: '6-Month Treasury',
  DGS1: '1-Year Treasury',
  DGS5: '5-Year Treasury',
  DGS7: '7-Year Treasury',
  DGS20: '20-Year Treasury'
} as const;

interface BackendFREDResponse {
  seriesId: string;
  title: string;
  value: number;
  date: string;
  change: number;
  observations: Array<{
    date: string;
    value: string;
  }>;
}

interface BatchResponse {
  successful: BackendFREDResponse[];
  failed: Array<{
    success: false;
    seriesId: string;
    error: any;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

class FREDApiService {
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      return response.data.status === 'OK' && response.data.fredApiKeyConfigured;
    } catch (error: any) {
      console.warn('Backend health check failed:', error.message);
      return false;
    }
  }

  private async fetchSeries(seriesId: string): Promise<FREDSeries | null> {
    try {
      const response = await axios.get<BackendFREDResponse>(`${API_BASE_URL}/fred/series/${seriesId}`, {
        timeout: 15000
      });

      return {
        id: response.data.seriesId,
        title: FRED_SERIES[seriesId as keyof typeof FRED_SERIES] || response.data.title,
        value: response.data.value,
        date: response.data.date,
        change: response.data.change
      };
    } catch (error: any) {
      console.error(`Error fetching series ${seriesId}:`, error.message);
      return null;
    }
  }

  private async fetchMultipleSeries(seriesIds: string[]): Promise<(FREDSeries | null)[]> {
    try {
      const response = await axios.post<BatchResponse>(`${API_BASE_URL}/fred/batch`, {
        seriesIds
      }, {
        timeout: 30000 // 30 seconds for batch request
      });

      console.log(`Batch request summary: ${response.data.summary.successful}/${response.data.summary.total} successful`);

      // Convert successful responses to FREDSeries format
      const seriesMap = new Map<string, FREDSeries>();
      
      response.data.successful.forEach(item => {
        seriesMap.set(item.seriesId, {
          id: item.seriesId,
          title: FRED_SERIES[item.seriesId as keyof typeof FRED_SERIES] || item.title,
          value: item.value,
          date: item.date,
          change: item.change
        });
      });

      // Return array in same order as requested, with null for failed requests
      return seriesIds.map(id => seriesMap.get(id) || null);

    } catch (error: any) {
      console.error('Batch request failed:', error.message);
      throw error;
    }
  }

  private calculateTrend(change: number): 'up' | 'down' | 'flat' {
    if (Math.abs(change) < 0.01) return 'flat';
    return change > 0 ? 'up' : 'down';
  }

  private processYieldCurveData(seriesData: (FREDSeries | null)[]): YieldCurvePoint[] {
    const maturities = [
      { series: 'DGS3MO', months: 3, label: '3M' },
      { series: 'DGS6MO', months: 6, label: '6M' },
      { series: 'DGS1', months: 12, label: '1Y' },
      { series: 'DGS2', months: 24, label: '2Y' },
      { series: 'DGS5', months: 60, label: '5Y' },
      { series: 'DGS7', months: 84, label: '7Y' },
      { series: 'DGS10', months: 120, label: '10Y' },
      { series: 'DGS20', months: 240, label: '20Y' },
      { series: 'DGS30', months: 360, label: '30Y' }
    ];

    const seriesDataMap = new Map<string, FREDSeries>();
    seriesData.forEach(item => {
      if (item) seriesDataMap.set(item.id, item);
    });

    return maturities
      .map(maturity => {
        const data = seriesDataMap.get(maturity.series);
        return data ? {
          maturity: maturity.label,
          months: maturity.months,
          yield: data.value
        } : null;
      })
      .filter((point): point is YieldCurvePoint => point !== null)
      .sort((a, b) => a.months - b.months);
  }

  async getDashboardData(): Promise<DashboardData> {
    try {
      // Check if backend is available
      const backendAvailable = await this.checkBackendHealth();
      
      if (!backendAvailable) {
        console.warn('Backend not available or API key not configured - using mock data');
        return this.getMockData();
      }

      // Fetch all required series through backend
      const mainSeries = [
        'DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS7', 'DGS10', 'DGS20', 'DGS30',
        'T10Y2Y', 'FEDFUNDS', 'SOFR', 'SP500', 'VIXCLS', 'DTWEXBGS', 
        'BAMLH0A0HYM2', 'BAMLC0A0CM'
      ];

      const seriesData = await this.fetchMultipleSeries(mainSeries);
      
      // Count successful vs failed
      const successfulCount = seriesData.filter(s => s !== null).length;
      console.log(`Live data: ${successfulCount}/${mainSeries.length} series fetched successfully`);

      // If too many failed, fall back to mock data
      if (successfulCount < mainSeries.length * 0.6) { // Less than 60% success
        console.warn('Too many FRED API failures - falling back to mock data');
        return this.getMockData();
      }

      // Process Treasury Yields
      const treasuryYields: TreasuryYield[] = [
        { series: 'DGS2', maturity: '2Y' },
        { series: 'DGS10', maturity: '10Y' },
        { series: 'DGS30', maturity: '30Y' }
      ].map(({ series, maturity }) => {
        const data = seriesData.find(s => s?.id === series);
        return data ? {
          maturity,
          yield: data.value,
          change: data.change || 0,
          changeBps: Math.round((data.change || 0) * 100),
          trend: this.calculateTrend(data.change || 0),
          lastUpdated: data.date
        } : {
          maturity,
          yield: 0,
          change: 0,
          changeBps: 0,
          trend: 'flat' as const,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      // Process Yield Spreads
      const yieldSpreads: YieldSpread[] = [];
      const spreadData = seriesData.find(s => s?.id === 'T10Y2Y');
      if (spreadData) {
        yieldSpreads.push({
          name: '10Y-2Y Spread',
          value: spreadData.value,
          change: spreadData.change || 0,
          isInverted: spreadData.value < 0,
          lastUpdated: spreadData.date
        });
      }

      // Calculate 10Y-30Y spread
      const dgs10 = seriesData.find(s => s?.id === 'DGS10');
      const dgs30 = seriesData.find(s => s?.id === 'DGS30');
      if (dgs10 && dgs30) {
        yieldSpreads.push({
          name: '30Y-10Y Spread',
          value: dgs30.value - dgs10.value,
          change: (dgs30.change || 0) - (dgs10.change || 0),
          isInverted: false,
          lastUpdated: dgs10.date
        });
      }

      // Process Policy Rates
      const policyRates: PolicyRate[] = [
        { series: 'FEDFUNDS', name: 'Fed Funds' },
        { series: 'SOFR', name: 'SOFR' }
      ].map(({ series, name }) => {
        const data = seriesData.find(s => s?.id === series);
        return data ? {
          name,
          rate: data.value,
          change: data.change || 0,
          lastUpdated: data.date
        } : {
          name,
          rate: 0,
          change: 0,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      // Process Market Indicators
      const marketIndicators: MarketIndicator[] = [
        { series: 'SP500', name: 'S&P 500' },
        { series: 'VIXCLS', name: 'VIX' },
        { series: 'DTWEXBGS', name: 'Dollar Index' }
      ].map(({ series, name }) => {
        const data = seriesData.find(s => s?.id === series);
        return data ? {
          name,
          value: data.value,
          change: data.change || 0,
          changePercent: data.value !== 0 ? ((data.change || 0) / data.value) * 100 : 0,
          lastUpdated: data.date
        } : {
          name,
          value: 0,
          change: 0,
          changePercent: 0,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      // Process Credit Spreads
      const creditSpreads: CreditSpread[] = [
        { series: 'BAMLC0A0CM', name: 'Investment Grade', rating: 'IG' as const },
        { series: 'BAMLH0A0HYM2', name: 'High Yield', rating: 'HY' as const }
      ].map(({ series, name, rating }) => {
        const data = seriesData.find(s => s?.id === series);
        return data ? {
          name,
          spread: data.value,
          change: data.change || 0,
          rating,
          lastUpdated: data.date
        } : {
          name,
          spread: 0,
          change: 0,
          rating,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      // Process Yield Curve
      const yieldCurve = this.processYieldCurveData(seriesData);

      return {
        treasuryYields,
        yieldSpreads,
        policyRates,
        marketIndicators,
        creditSpreads,
        yieldCurve,
        lastUpdated: new Date().toISOString(),
        dataSource: 'live' as const
      };

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      console.warn('Falling back to mock data due to API error');
      return this.getMockData();
    }
  }

  // Realistic mock data based on current market conditions
  getMockData(): DashboardData {
    const currentDate = new Date().toISOString().split('T')[0];
    return {
      treasuryYields: [
        {
          maturity: '2Y',
          yield: 4.28,
          change: 0.03,
          changeBps: 3,
          trend: 'up',
          lastUpdated: currentDate
        },
        {
          maturity: '10Y',
          yield: 4.19,
          change: -0.02,
          changeBps: -2,
          trend: 'down',
          lastUpdated: currentDate
        },
        {
          maturity: '30Y',
          yield: 4.41,
          change: -0.01,
          changeBps: -1,
          trend: 'down',
          lastUpdated: currentDate
        }
      ],
      yieldSpreads: [
        {
          name: '10Y-2Y Spread',
          value: -0.09,
          change: -0.05,
          isInverted: true,
          lastUpdated: currentDate
        },
        {
          name: '30Y-10Y Spread',
          value: 0.22,
          change: 0.01,
          isInverted: false,
          lastUpdated: currentDate
        }
      ],
      policyRates: [
        {
          name: 'Fed Funds',
          rate: 5.33,
          change: 0.00,
          lastUpdated: currentDate
        },
        {
          name: 'SOFR',
          rate: 5.31,
          change: -0.02,
          lastUpdated: currentDate
        }
      ],
      marketIndicators: [
        {
          name: 'S&P 500',
          value: 4697.24,
          change: -8.67,
          changePercent: -0.18,
          lastUpdated: currentDate
        },
        {
          name: 'VIX',
          value: 14.82,
          change: 1.23,
          changePercent: 9.06,
          lastUpdated: currentDate
        },
        {
          name: 'Dollar Index',
          value: 105.87,
          change: 0.34,
          changePercent: 0.32,
          lastUpdated: currentDate
        }
      ],
      creditSpreads: [
        {
          name: 'Investment Grade',
          spread: 95,
          change: -2,
          rating: 'IG',
          lastUpdated: currentDate
        },
        {
          name: 'High Yield',
          spread: 322,
          change: -8,
          rating: 'HY',
          lastUpdated: currentDate
        }
      ],
      yieldCurve: [
        { maturity: '3M', months: 3, yield: 5.32 },
        { maturity: '6M', months: 6, yield: 5.11 },
        { maturity: '1Y', months: 12, yield: 4.87 },
        { maturity: '2Y', months: 24, yield: 4.28 },
        { maturity: '5Y', months: 60, yield: 4.12 },
        { maturity: '7Y', months: 84, yield: 4.15 },
        { maturity: '10Y', months: 120, yield: 4.19 },
        { maturity: '20Y', months: 240, yield: 4.35 },
        { maturity: '30Y', months: 360, yield: 4.41 }
      ],
      lastUpdated: new Date().toISOString(),
      dataSource: 'mock' as const
    };
  }
}

export const fredApiService = new FREDApiService(); 