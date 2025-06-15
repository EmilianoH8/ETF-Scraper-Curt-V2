import React from 'react';
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
  divergences?: string[];
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

  // Calculate changes
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

  // 2. Growth vs Recession Signal
  const calculateGrowthSignal = (): SignalResult => {
    let sentiment: SignalSentiment;
    let text = "";

    if (yieldCurveSpread > 1.0 && fedRate <= 3 && creditSpreadPct < 1.5) {
      sentiment = 'Strong Bullish';
      text = `Yield curve remains comfortably positive at ${yieldCurveSpread.toFixed(2)}%, suggesting continued expansion.`;
    } else if (yieldCurveSpread > 0.5) {
      sentiment = 'Bullish';
      text = `Curve at ${yieldCurveSpread.toFixed(2)}% indicates moderate growth expectations.`;
    } else if (yieldCurveSpread > 0) {
      sentiment = 'Neutral';
      text = `Curve flattening to ${yieldCurveSpread.toFixed(2)}% raises growth concerns for H2 2025.`;
    } else if (yieldCurveSpread > -0.5) {
      sentiment = 'Bearish';
      text = `Inverted curve at ${yieldCurveSpread.toFixed(2)}% historically signals recession within 12-18 months.`;
    } else {
      sentiment = 'Strong Bearish';
      text = `Deeply inverted curve at ${yieldCurveSpread.toFixed(2)}% indicates imminent recession risk.`;
    }

    const confidence: ConfidenceLevel = Math.abs(yieldCurveSpread) > 0.5 ? 'High' : 'Moderate';

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

  // 5. Key Divergences
  const calculateDivergences = (): SignalResult => {
    const divergences = [];

    if (vix < 20 && creditSpreadPct > 2.0) {
      divergences.push("Bond markets pricing stress while equities remain calm");
    }
    if (yieldCurveSpread > 0 && creditSpreadPct > 2.0) {
      divergences.push("Positive yield curve conflicts with credit stress");
    }
    if (fedRateChange < 0 && creditSpreadPct > prevCreditSpread) {
      divergences.push("Fed easing but financial conditions still tightening");
    }

    let sentiment: SignalSentiment = 'Neutral';
    let text = "";

    if (divergences.length === 0) {
      text = "No significant divergences detected. Indicators showing logical consistency.";
    } else if (divergences.length === 1) {
      text = `Minor divergence: ${divergences[0]}. Monitor for confirmation.`;
      sentiment = 'Bearish';
    } else {
      text = `Multiple divergences detected requiring attention.`;
      sentiment = 'Strong Bearish';
    }

    const confidence: ConfidenceLevel = divergences.length === 0 ? 'High' : 'Low';

    return { sentiment, confidence, text, divergences };
  };

  // Calculate all signals
  const signals = [
    { title: "Overall Market Sentiment", result: calculateOverallSentiment(), icon: "📊" },
    { title: "Growth vs Recession Signal", result: calculateGrowthSignal(), icon: "📈" },
    { title: "Financial Conditions", result: calculateFinancialConditions(), icon: "🏦" },
    { title: "Risk Sentiment", result: calculateRiskSentiment(), icon: "⚡" },
    { title: "Key Divergences", result: calculateDivergences(), icon: "⚠️" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Market Signals</h2>
        <div className="text-sm text-gray-500">
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {signals.map((signal, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{signal.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{signal.title}</h3>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSentimentColor(signal.result.sentiment)}`}>
                      {signal.result.sentiment}
                    </span>
                    <span className={`text-sm font-medium ${getConfidenceColor(signal.result.confidence)}`}>
                      {signal.result.confidence} Confidence
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {signal.result.text}
            </p>

            {signal.result.divergences && signal.result.divergences.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-sm">⚠️</span>
                  <div className="text-yellow-800 text-sm">
                    <div className="font-medium mb-1">Divergences:</div>
                    <ul className="space-y-1">
                      {signal.result.divergences.map((div, idx) => (
                        <li key={idx} className="text-xs">• {div}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Indicators</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{yieldCurveSpread.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">10Y-2Y Spread</div>
            <div className={`text-xs ${yieldSpreadChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {yieldSpreadChange >= 0 ? '+' : ''}{(yieldSpreadChange * 100).toFixed(0)}bps
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{fedRate.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">Fed Funds Rate</div>
            <div className={`text-xs ${fedRateChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fedRateChange >= 0 ? '+' : ''}{(fedRateChange * 100).toFixed(0)}bps
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{creditSpreadPct.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Credit Spreads</div>
            <div className={`text-xs ${creditSpreadChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {creditSpreadChange >= 0 ? '+' : ''}{(creditSpreadChange * 100).toFixed(0)}bps
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{vix.toFixed(1)}</div>
            <div className="text-sm text-gray-600">VIX</div>
            <div className={`text-xs ${vixChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {vixChange >= 0 ? '+' : ''}{vixChange.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSignals; 