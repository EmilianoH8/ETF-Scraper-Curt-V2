export interface TreasuryYield {
  maturity: string;
  yield: number;
  change: number;
  changeBps: number;
  trend: 'up' | 'down' | 'flat';
  lastUpdated: string;
}

export interface YieldSpread {
  name: string;
  value: number;
  change: number;
  isInverted: boolean;
  lastUpdated: string;
}

export interface PolicyRate {
  name: string;
  rate: number;
  change: number;
  lastUpdated: string;
}

export interface MarketIndicator {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface CreditSpread {
  name: string;
  spread: number;
  change: number;
  rating: 'IG' | 'HY';
  lastUpdated: string;
}

export interface YieldCurvePoint {
  maturity: string;
  months: number;
  yield: number;
}

export interface FREDSeries {
  id: string;
  title: string;
  value: number;
  date: string;
  change?: number;
}

export interface DashboardData {
  treasuryYields: TreasuryYield[];
  yieldSpreads: YieldSpread[];
  policyRates: PolicyRate[];
  marketIndicators: MarketIndicator[];
  creditSpreads: CreditSpread[];
  yieldCurve: YieldCurvePoint[];
  lastUpdated: string;
  dataSource: 'live' | 'mock';
}

export interface MarketSignal {
  id: string;
  name: string;
  status: 'bullish' | 'bearish' | 'neutral';
  description: string;
  value: number;
  threshold: number;
}

export interface APIError {
  message: string;
  code?: string;
  status?: number;
} 