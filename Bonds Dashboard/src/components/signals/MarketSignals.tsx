import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { DashboardData, YieldSpread, CreditSpread } from '../../types/bonds';

interface MarketSignalsProps {
  data: DashboardData;
}

type SignalSentiment = 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
type ConfidenceLevel = 'High' | 'Moderate' | 'Low';

interface SignalResult {
  sentiment: SignalSentiment;
  confidence: ConfidenceLevel;
  text: string;
}

const MarketSignals: React.FC<MarketSignalsProps> = ({ data }) => {
  // Extract current indicator values
  const yieldCurveSpread = data.yieldSpreads.find((s: YieldSpread) => s.name === '10Y-2Y Spread')?.value || -0.09;
  const fedRate = 5.25; // Mock current Fed Funds rate
  const creditSpread = data.creditSpreads.find((s: CreditSpread) => s.rating === 'IG')?.spread || 150;
  const creditSpreadPct = creditSpread / 100; // Convert bps to percentage
  const vix = 18.5; // Mock VIX value

  // Mock previous values for rate-of-change calculations
  const prevYieldSpread = yieldCurveSpread + 0.05;
  const prevFedRate = 5.00;
  const prevCreditSpread = creditSpreadPct - 0.1;
  const prevVix = 16.2;

  // Calculate changes with proper precision
  const formatChange = (change: number, decimals: number = 0): string => {
    const rounded = parseFloat(change.toFixed(decimals));
    return rounded >= 0 ? `+${rounded}` : `${rounded}`;
  };

  const yieldSpreadChange = yieldCurveSpread - prevYieldSpread;
  const fedRateChange = fedRate - prevFedRate;
  const creditSpreadChange = creditSpreadPct - prevCreditSpread;
  const vixChange = vix - prevVix;

  const getSentimentColor = (sentiment: SignalSentiment) => {
    switch (sentiment) {
      case 'Strong Bullish': return 'bg-green-100 text-green-800 border-green-300';
      case 'Bullish': return 'bg-green-50 text-green-700 border-green-200';
      case 'Neutral': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Bearish': return 'bg-red-50 text-red-700 border-red-200';
      case 'Strong Bearish': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getConfidenceColor = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'High': return 'text-green-600';
      case 'Moderate': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
    }
  };

  // 1. Overall Market Sentiment
  const calculateOverallSentiment = (): SignalResult => {
    const yieldSignal = yieldCurveSpread > 0.5 ? 1 : yieldCurveSpread > 0 ? 0 : -1;
    const fedSignal = fedRate < 3 ? 1 : fedRate < 4 ? 0 : -1;
    const creditSignal = creditSpreadPct < 1.5 ? 1 : creditSpreadPct < 2.0 ? 0 : -1;
    const vixSignal = vix < 20 ? 1 : vix < 25 ? 0 : -1;

    const signals = [yieldSignal, fedSignal, creditSignal, vixSignal];
    const totalScore = signals.reduce((sum, signal) => sum + signal, 0);
    const avgScore = totalScore / signals.length;
    const agreement = signals.filter(s => Math.abs(s - avgScore) <= 0.5).length;

    let sentiment: SignalSentiment;
    if (totalScore >= 3) sentiment = 'Strong Bullish';
    else if (totalScore >= 1) sentiment = 'Bullish';
    else if (totalScore >= -1) sentiment = 'Neutral';
    else if (totalScore >= -3) sentiment = 'Bearish';
    else sentiment = 'Strong Bearish';

    const confidence: ConfidenceLevel = agreement >= 3 ? 'High' : agreement >= 2 ? 'Moderate' : 'Low';

    let text = `Markets show ${sentiment.toLowerCase()} positioning with ${agreement}/4 indicators aligned. `;
    text += `Yield curve at ${yieldCurveSpread.toFixed(2)}%, Fed at ${fedRate}%, credit spreads ${creditSpreadPct.toFixed(1)}%, VIX ${vix}.`;

    return { sentiment, confidence, text };
  };

  // 2. Yield Curve Signal
  const calculateYieldCurveSignal = (): SignalResult => {
    let sentiment: SignalSentiment;
    let text = "";

    if (yieldCurveSpread > 1.0) {
      sentiment = 'Strong Bullish';
      text = `Steep yield curve at ${yieldCurveSpread.toFixed(2)}% signals robust growth expectations and healthy economic conditions.`;
    } else if (yieldCurveSpread > 0.3) {
      sentiment = 'Bullish';
      text = `Positive yield curve at ${yieldCurveSpread.toFixed(2)}% maintains constructive economic outlook.`;
    } else if (yieldCurveSpread > 0) {
      sentiment = 'Neutral';
      text = `Flattening curve at ${yieldCurveSpread.toFixed(2)}% suggests moderating growth expectations.`;
    } else if (yieldCurveSpread > -0.5) {
      sentiment = 'Bearish';
      text = `Inverted curve at ${yieldCurveSpread.toFixed(2)}% historically precedes economic slowdowns.`;
    } else {
      sentiment = 'Strong Bearish';
      text = `Deeply inverted curve at ${yieldCurveSpread.toFixed(2)}% indicates significant recession risk.`;
    }

    const confidence: ConfidenceLevel = Math.abs(yieldSpreadChange) >= 0.1 ? 'High' : 'Moderate';

    return { sentiment, confidence, text };
  };

  // 3. Financial Conditions
  const calculateFinancialConditions = (): SignalResult => {
    let sentiment: SignalSentiment;
    let text = "";

    if (fedRate < 2 && creditSpreadPct < 1.0) {
      sentiment = 'Strong Bullish';
      text = `Financial conditions remain ultra-easy with Fed at ${fedRate}% and credit spreads tight.`;
    } else if (fedRate <= 3 && creditSpreadPct < 1.5) {
      sentiment = 'Bullish';
      text = `Accommodative conditions persist with Fed at ${fedRate}%.`;
    } else if (fedRate <= 4 && creditSpreadPct < 2.0) {
      sentiment = 'Neutral';
      text = `Policy approaching neutral at ${fedRate}% with balanced credit conditions.`;
    } else if (fedRate > 4 && creditSpreadPct < 2.5) {
      sentiment = 'Bearish';
      text = `Fed tightening beginning to bite with rates at ${fedRate}%.`;
    } else {
      sentiment = 'Strong Bearish';
      text = `Restrictive policy at ${fedRate}% creating significant headwinds.`;
    }

    const confidence: ConfidenceLevel = Math.abs(fedRateChange) >= 0.25 ? 'High' : 'Moderate';

    return { sentiment, confidence, text };
  };

  // 4. Risk Sentiment
  const calculateRiskSentiment = (): SignalResult => {
    let sentiment: SignalSentiment;
    let text = "";

    if (creditSpreadPct < 1.0 && vix < 15) {
      sentiment = 'Strong Bullish';
      text = `Strong risk appetite with VIX at ${vix} and spreads at cycle tights.`;
    } else if (creditSpreadPct < 1.5 && vix < 20) {
      sentiment = 'Bullish';
      text = `Constructive risk sentiment with contained volatility at ${vix}.`;
    } else if (creditSpreadPct < 2.0 && vix < 25) {
      sentiment = 'Neutral';
      text = `Balanced risk positioning with VIX at ${vix}.`;
    } else if (creditSpreadPct > 2.0 || vix > 25) {
      sentiment = 'Bearish';
      text = `Risk-off positioning evident with elevated stress indicators.`;
    } else {
      sentiment = 'Strong Bearish';
      text = `Panic conditions with VIX at ${vix}.`;
    }

    const confidence: ConfidenceLevel = Math.abs(vixChange) >= 5 ? 'High' : 'Moderate';

    return { sentiment, confidence, text };
  };

  // 5. Policy Divergence
  const calculatePolicyDivergence = (): SignalResult => {
    const realYield = fedRate - 2.5; // Assume 2.5% inflation target
    
    let sentiment: SignalSentiment;
    let text = "";

    if (realYield < -1) {
      sentiment = 'Strong Bullish';
      text = `Deeply negative real rates at ${realYield.toFixed(1)}% provide massive monetary stimulus.`;
    } else if (realYield < 0) {
      sentiment = 'Bullish';
      text = `Negative real yields support risk assets and economic activity.`;
    } else if (realYield < 1) {
      sentiment = 'Neutral';
      text = `Modest positive real rates maintain balanced monetary conditions.`;
    } else if (realYield < 2) {
      sentiment = 'Bearish';
      text = `Restrictive real rates beginning to constrain economic activity.`;
    } else {
      sentiment = 'Strong Bearish';
      text = `Highly restrictive real rates at ${realYield.toFixed(1)}% likely to dampen growth significantly.`;
    }

    const confidence: ConfidenceLevel = Math.abs(fedRateChange) >= 0.5 ? 'High' : 'Moderate';

    return { sentiment, confidence, text };
  };

  const overallSignal = calculateOverallSentiment();
  const yieldCurveSignal = calculateYieldCurveSignal();
  const financialConditionsSignal = calculateFinancialConditions();
  const riskSentimentSignal = calculateRiskSentiment();
  const policyDivergenceSignal = calculatePolicyDivergence();

  const signals = [
    { id: 'overall', name: 'Overall Market', icon: <BarChart3 className="w-4 h-4" />, ...overallSignal },
    { id: 'yield-curve', name: 'Yield Curve', icon: <TrendingUp className="w-4 h-4" />, ...yieldCurveSignal },
    { id: 'financial', name: 'Financial Conditions', icon: <Target className="w-4 h-4" />, ...financialConditionsSignal },
    { id: 'risk', name: 'Risk Sentiment', icon: <AlertTriangle className="w-4 h-4" />, ...riskSentimentSignal },
    { id: 'policy', name: 'Policy Stance', icon: <TrendingDown className="w-4 h-4" />, ...policyDivergenceSignal }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Market Signals Analysis</h2>
        <p className="text-sm text-gray-600">Real-time interpretation of key market indicators</p>
      </div>

      {/* Overall Signal Card */}
      <div className={`rounded-lg border-2 p-4 sm:p-6 ${getSentimentColor(overallSignal.sentiment)}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <div className="p-2 bg-white bg-opacity-50 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Overall Market Sentiment</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{overallSignal.sentiment}</span>
                <span className={`text-xs ${getConfidenceColor(overallSignal.confidence)}`}>
                  ({overallSignal.confidence} Confidence)
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{overallSignal.text}</p>
      </div>

      {/* Individual Signals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {signals.slice(1).map((signal) => (
          <div key={signal.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${getSentimentColor(signal.sentiment).split(' ')[0]} ${getSentimentColor(signal.sentiment).split(' ')[0].replace('bg-', 'text-').replace('-100', '-600')}`}>
                  {signal.icon}
                </div>
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">{signal.name}</h4>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(signal.sentiment)}`}>
                  {signal.sentiment}
                </span>
                <div className={`text-xs mt-1 ${getConfidenceColor(signal.confidence)}`}>
                  {signal.confidence}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{signal.text}</p>
          </div>
        ))}
      </div>

      {/* Current Indicators Summary */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Indicators</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{yieldCurveSpread.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">10Y-2Y Spread</div>
            <div className={`text-xs ${yieldSpreadChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(yieldSpreadChange * 100, 0)}bps
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{fedRate.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">Fed Funds Rate</div>
            <div className={`text-xs ${fedRateChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatChange(fedRateChange * 100, 0)}bps
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{creditSpreadPct.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Credit Spreads</div>
            <div className={`text-xs ${creditSpreadChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatChange(creditSpreadChange * 100, 0)}bps
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{vix.toFixed(1)}</div>
            <div className="text-sm text-gray-600">VIX</div>
            <div className={`text-xs ${vixChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatChange(vixChange, 1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSignals; 