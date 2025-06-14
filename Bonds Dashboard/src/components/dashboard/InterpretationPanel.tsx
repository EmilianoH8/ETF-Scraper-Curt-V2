import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Info } from 'lucide-react';
import { DashboardData, MarketSignal } from '../../types/bonds';

interface InterpretationPanelProps {
  data: DashboardData;
}

const InterpretationPanel: React.FC<InterpretationPanelProps> = ({ data }) => {
  const generateMarketSignals = (): MarketSignal[] => {
    const signals: MarketSignal[] = [];
    
    // 2s/10s Spread Signal
    const twoTenSpread = data.yieldSpreads.find(s => s.name === '10Y-2Y Spread');
    if (twoTenSpread) {
      signals.push({
        id: 'yield-curve',
        name: 'Yield Curve',
        status: twoTenSpread.value < -0.5 ? 'bearish' : twoTenSpread.value < 0 ? 'neutral' : 'bullish',
        description: twoTenSpread.isInverted 
          ? 'Inverted yield curve signals potential recession risk'
          : 'Normal yield curve shape supports economic growth expectations',
        value: twoTenSpread.value,
        threshold: 0
      });
    }

    // Fed Policy Signal
    const fedFunds = data.policyRates.find(r => r.name === 'Fed Funds');
    const tenYear = data.treasuryYields.find(y => y.maturity === '10Y');
    if (fedFunds && tenYear) {
      const realRate = tenYear.yield - 2.5; // Assuming 2.5% inflation expectation
      signals.push({
        id: 'fed-policy',
        name: 'Fed Policy Stance',
        status: fedFunds.rate > tenYear.yield ? 'bearish' : fedFunds.rate > 4.5 ? 'neutral' : 'bullish',
        description: fedFunds.rate > tenYear.yield 
          ? 'Fed funds above 10Y yield suggests restrictive policy'
          : 'Policy rates appear accommodative for current conditions',
        value: fedFunds.rate,
        threshold: tenYear.yield
      });
    }

    // Credit Spread Signal
    const igSpread = data.creditSpreads.find(s => s.rating === 'IG');
    const hySpread = data.creditSpreads.find(s => s.rating === 'HY');
    if (igSpread) {
      signals.push({
        id: 'credit-risk',
        name: 'Credit Risk',
        status: igSpread.spread > 150 ? 'bearish' : igSpread.spread > 100 ? 'neutral' : 'bullish',
        description: igSpread.spread > 150 
          ? 'Elevated credit spreads indicate stress in corporate bonds'
          : 'Credit spreads remain manageable, supporting risk assets',
        value: igSpread.spread,
        threshold: 100
      });
    }

    // VIX Fear Gauge
    const vix = data.marketIndicators.find(m => m.name === 'VIX');
    if (vix) {
      signals.push({
        id: 'market-volatility',
        name: 'Market Volatility',
        status: vix.value > 25 ? 'bearish' : vix.value > 15 ? 'neutral' : 'bullish',
        description: vix.value > 25 
          ? 'Elevated VIX suggests heightened market fear and uncertainty'
          : 'Low VIX indicates market complacency and risk appetite',
        value: vix.value,
        threshold: 15
      });
    }

    return signals;
  };

  const getSignalIcon = (status: 'bullish' | 'bearish' | 'neutral') => {
    switch (status) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getSignalClass = (status: 'bullish' | 'bearish' | 'neutral') => {
    switch (status) {
      case 'bullish':
        return 'signal-indicator-bullish';
      case 'bearish':
        return 'signal-indicator-bearish';
      default:
        return 'signal-indicator-neutral';
    }
  };

  const signals = generateMarketSignals();

  // Calculate overall market sentiment
  const bullishCount = signals.filter(s => s.status === 'bullish').length;
  const bearishCount = signals.filter(s => s.status === 'bearish').length;
  const overallSentiment = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';

  return (
    <div className="space-y-6">
      {/* Overall Market Sentiment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Overall Market Sentiment</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSignalClass(overallSentiment)}`}>
            {overallSentiment.toUpperCase()}
          </div>
        </div>
        <p className="text-gray-600">
          Based on {signals.length} key indicators: {bullishCount} bullish, {bearishCount} bearish, {signals.length - bullishCount - bearishCount} neutral
        </p>
      </div>

      {/* Individual Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals.map((signal) => (
          <div key={signal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${getSignalClass(signal.status)}`}>
                  {getSignalIcon(signal.status)}
                </div>
                <h4 className="font-medium text-gray-900">{signal.name}</h4>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getSignalClass(signal.status)}`}>
                {signal.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{signal.description}</p>
            <div className="text-xs text-gray-500">
              Current: {signal.value.toFixed(2)} | Threshold: {signal.threshold.toFixed(2)}
            </div>
          </div>
        ))}
      </div>


    </div>
  );
};

export default InterpretationPanel; 