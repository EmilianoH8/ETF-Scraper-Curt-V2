import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { DashboardData } from '../types/bonds';

interface MetricsGridProps {
  data: DashboardData;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ data }) => {
  // FRED Series ID mapping for clickable links
  const getFredSeriesId = (indicatorName: string, section: string): string | null => {
    const mapping: Record<string, string> = {
      // Treasury Yields
      '2Y': 'DGS2',
      '10Y': 'DGS10', 
      '30Y': 'DGS30',
      // Spreads
      '10Y-2Y Spread': 'T10Y2Y',
      '30Y-10Y Spread': 'T30Y10Y', // Note: This might not exist, will fallback gracefully
      // Policy Rates
      'Fed Funds': 'FEDFUNDS',
      'SOFR': 'SOFR',
      // Market Indicators
      'S&P 500': 'SP500',
      'VIX': 'VIXCLS',
      'Dollar Index': 'DTWEXBGS',
      // Credit Spreads
      'Investment Grade': 'BAMLC0A0CM',
      'High Yield': 'BAMLH0A0HYM2'
    };
    return mapping[indicatorName] || null;
  };

  const handleIndicatorClick = (indicatorName: string, section: string): void => {
    const seriesId = getFredSeriesId(indicatorName, section);
    if (seriesId) {
      const fredUrl = `https://fred.stlouisfed.org/series/${seriesId}`;
      window.open(fredUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return 'text-bear-red'; // Rising yields are bearish for bonds
      case 'down':
        return 'text-bull-green'; // Falling yields are bullish for bonds
      default:
        return 'text-financial-gray';
    }
  };

  const getChangeColor = (change: number) => {
    if (Math.abs(change) < 0.01) return 'text-financial-gray';
    return change > 0 ? 'text-bear-red' : 'text-bull-green';
  };

  // Filter data for specific sections
  const treasuryYieldsFiltered = data.treasuryYields.filter(yield_ => 
    ['2Y', '10Y', '30Y'].includes(yield_.maturity)
  );

  const marketIndicatorsFiltered = data.marketIndicators.filter(indicator =>
    ['S&P 500', 'VIX', 'Dollar Index'].includes(indicator.name)
  );

  const policyRatesFiltered = data.policyRates;

  const creditSpreadsFiltered = data.creditSpreads;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Treasury Yields Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-1">
          Treasury Yields
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {treasuryYieldsFiltered.map((yield_) => (
            <div 
              key={yield_.maturity} 
              className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-200"
              onClick={() => handleIndicatorClick(yield_.maturity, 'treasury')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleIndicatorClick(yield_.maturity, 'treasury');
                }
              }}
              title={`Click to view ${yield_.maturity} Treasury data on FRED`}
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium text-gray-600">{yield_.maturity}</h4>
                <div className={`${getTrendColor(yield_.trend)}`}>
                  {getTrendIcon(yield_.trend)}
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900">{yield_.yield.toFixed(2)}%</div>
              <div className={`text-xs ${getChangeColor(yield_.change)}`}>
                {yield_.changeBps > 0 ? '+' : ''}{yield_.changeBps} bps
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spreads Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-1">
          Spreads
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {data.yieldSpreads.map((spread) => (
            <div 
              key={spread.name} 
              className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-200"
              onClick={() => handleIndicatorClick(spread.name, 'spreads')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleIndicatorClick(spread.name, 'spreads');
                }
              }}
              title={`Click to view ${spread.name} data on FRED`}
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium text-gray-600 truncate">{spread.name}</h4>
                {spread.isInverted && (
                  <div title="Inverted Curve">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  </div>
                )}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {spread.value >= 0 ? '+' : ''}{spread.value.toFixed(2)}%
              </div>
              <div className={`text-xs ${getChangeColor(spread.change)}`}>
                {spread.change > 0 ? '+' : ''}{(spread.change * 100).toFixed(0)} bps
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Indicators Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-1">
          Market Indicators
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {marketIndicatorsFiltered.map((indicator) => (
            <div 
              key={indicator.name} 
              className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-200"
              onClick={() => handleIndicatorClick(indicator.name, 'market')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleIndicatorClick(indicator.name, 'market');
                }
              }}
              title={`Click to view ${indicator.name} data on FRED`}
            >
              <div className="mb-1">
                <h4 className="text-xs font-medium text-gray-600 truncate">{indicator.name}</h4>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {indicator.name === 'S&P 500' 
                  ? indicator.value.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : indicator.value.toFixed(2)
                }
              </div>
              <div className={`text-xs ${getChangeColor(indicator.change)}`}>
                {indicator.change > 0 ? '+' : ''}{indicator.change.toFixed(2)} 
                ({indicator.changePercent > 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rates & Credit Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-1">
          Rates & Credit
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {/* Policy Rates */}
          {policyRatesFiltered.map((rate) => (
            <div 
              key={rate.name} 
              className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-200"
              onClick={() => handleIndicatorClick(rate.name, 'rates')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleIndicatorClick(rate.name, 'rates');
                }
              }}
              title={`Click to view ${rate.name} data on FRED`}
            >
              <div className="mb-1">
                <h4 className="text-xs font-medium text-gray-600 truncate">{rate.name}</h4>
              </div>
              <div className="text-lg font-bold text-gray-900">{rate.rate.toFixed(2)}%</div>
              <div className={`text-xs ${getChangeColor(rate.change)}`}>
                {rate.change > 0 ? '+' : ''}{(rate.change * 100).toFixed(0)} bps
              </div>
            </div>
          ))}

          {/* Credit Spreads (IG and HY) */}
          {creditSpreadsFiltered.map((spread) => (
            <div 
              key={spread.name} 
              className="bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-200"
              onClick={() => handleIndicatorClick(spread.name, 'credit')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleIndicatorClick(spread.name, 'credit');
                }
              }}
              title={`Click to view ${spread.name} data on FRED`}
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium text-gray-600 truncate">{spread.name}</h4>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  spread.rating === 'IG' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {spread.rating}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900">{spread.spread} bps</div>
              <div className={`text-xs ${getChangeColor(spread.change)}`}>
                {spread.change > 0 ? '+' : ''}{spread.change} bps
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid; 