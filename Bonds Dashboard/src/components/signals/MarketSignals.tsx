import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Shield, DollarSign, Target } from 'lucide-react';
import { DashboardData } from '../../types/bonds';

interface MarketSignalsProps {
  data: DashboardData;
}

interface Signal {
  id: string;
  name: string;
  regime: string;
  confidence: 'High' | 'Moderate' | 'Low';
  interpretation: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  metrics: Record<string, number>;
}

const MarketSignals: React.FC<MarketSignalsProps> = ({ data }) => {
  
  // Extract current values from data
  const currentInputs = useMemo(() => {
    const twoYear = data.treasuryYields.find(y => y.maturity === '2Y')?.yield || 0;
    const tenYear = data.treasuryYields.find(y => y.maturity === '10Y')?.yield || 0;
    const thirtyYear = data.treasuryYields.find(y => y.maturity === '30Y')?.yield || 0;
    const tenTwoSpread = data.yieldSpreads.find(s => s.name === '10Y-2Y')?.value || 0;
    const thirtyTenSpread = data.yieldSpreads.find(s => s.name === '30Y-10Y')?.value || 0;
    const sp500 = data.marketIndicators.find(i => i.name === 'S&P 500')?.value || 0;
    const vix = data.marketIndicators.find(i => i.name === 'VIX')?.value || 0;
    const dollarIndex = data.marketIndicators.find(i => i.name === 'Dollar Index')?.value || 0;
    const fedFunds = data.policyRates.find(r => r.name === 'Fed Funds')?.rate || 0;
    const sofr = data.policyRates.find(r => r.name === 'SOFR')?.rate || 0;
    const igSpread = (data.creditSpreads.find(s => s.name === 'IG Spread')?.spread || 0) * 100;
    const hySpread = (data.creditSpreads.find(s => s.name === 'HY Spread')?.spread || 0) * 100;

    return {
      twoYear, tenYear, thirtyYear, tenTwoSpread, thirtyTenSpread,
      sp500, vix, dollarIndex, fedFunds, sofr, igSpread, hySpread
    };
  }, [data]);

  // Calculate previous period values for rate of change
  const previousInputs = useMemo(() => {
    const twoYear = currentInputs.twoYear - (data.treasuryYields.find(y => y.maturity === '2Y')?.change || 0);
    const tenYear = currentInputs.tenYear - (data.treasuryYields.find(y => y.maturity === '10Y')?.change || 0);
    const thirtyYear = currentInputs.thirtyYear - (data.treasuryYields.find(y => y.maturity === '30Y')?.change || 0);
    const tenTwoSpread = currentInputs.tenTwoSpread - (data.yieldSpreads.find(s => s.name === '10Y-2Y')?.change || 0);
    const thirtyTenSpread = currentInputs.thirtyTenSpread - (data.yieldSpreads.find(s => s.name === '30Y-10Y')?.change || 0);
    
    return { twoYear, tenYear, thirtyYear, tenTwoSpread, thirtyTenSpread };
  }, [data, currentInputs]);

  // Economic Outlook Signal
  const calculateEconomicOutlook = (): Signal => {
    const { tenTwoSpread, thirtyTenSpread } = currentInputs;
    const tenTwoChange = tenTwoSpread - previousInputs.tenTwoSpread;
    
    let regime: string, color: string, bgColor: string;
    let confidence: 'High' | 'Moderate' | 'Low' = 'High';
    
    if (tenTwoSpread < -0.5) {
      regime = 'DEEP RECESSION RISK';
      color = 'text-red-700';
      bgColor = 'bg-red-50 border-red-200';
    } else if (tenTwoSpread < 0) {
      regime = 'RECESSION RISK';
      color = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
    } else if (tenTwoSpread < 0.5) {
      regime = 'SLOWDOWN WARNING';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 border-orange-200';
    } else if (tenTwoSpread < 1.5) {
      regime = 'MODERATE GROWTH';
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50 border-yellow-200';
    } else {
      regime = 'STRONG GROWTH';
      color = 'text-green-600';
      bgColor = 'bg-green-50 border-green-200';
    }

    if (Math.abs(tenTwoChange) > 0.2 || (tenTwoSpread > 0 && thirtyTenSpread < 0.2)) {
      confidence = 'Moderate';
    }

    const changeText = tenTwoChange > 0 ? `steepened by ${Math.abs(tenTwoChange * 100).toFixed(0)} bps` : 
                      tenTwoChange < 0 ? `flattened by ${Math.abs(tenTwoChange * 100).toFixed(0)} bps` : 'remained stable';
    
    let interpretation: string;
    if (regime.includes('RECESSION')) {
      interpretation = `The 10Y-2Y spread has inverted to ${(tenTwoSpread * 100).toFixed(0)} bps, having ${changeText} recently. Historical patterns show curves this inverted precede recessions by 6-18 months approximately 70% of the time. The 30Y-10Y spread at ${(thirtyTenSpread * 100).toFixed(0)} bps provides additional context on recession duration expectations.`;
    } else if (regime === 'SLOWDOWN WARNING') {
      interpretation = `The 10Y-2Y spread has flattened to ${(tenTwoSpread * 100).toFixed(0)} bps, having ${changeText}. This rapid flattening approaching inversion territory suggests bond markets are pricing significant economic deceleration over the next 12 months.`;
    } else {
      interpretation = `The yield curve remains positively sloped with 10Y-2Y at ${(tenTwoSpread * 100).toFixed(0)} bps, suggesting continued economic expansion. The curve has ${changeText}, indicating ${tenTwoChange > 0 ? 'improving' : 'moderating'} growth expectations.`;
    }

    return {
      id: 'economic-outlook',
      name: 'Economic Outlook',
      regime, confidence, interpretation, color, bgColor,
      icon: <TrendingUp className="w-5 h-5" />,
      metrics: { tenTwoSpread, thirtyTenSpread, tenTwoChange }
    };
  };

  // Risk Environment Signal
  const calculateRiskEnvironment = (): Signal => {
    const { igSpread, hySpread, vix } = currentInputs;
    
    let regime: string, color: string, bgColor: string;
    let confidence: 'High' | 'Moderate' | 'Low' = 'High';
    
    if (igSpread > 200 || hySpread > 800 || vix > 35) {
      regime = 'STRESS';
      color = 'text-red-700';
      bgColor = 'bg-red-50 border-red-200';
    } else if (igSpread > 150 || hySpread > 600 || vix > 25) {
      regime = 'RISK-OFF';
      color = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
    } else if (igSpread > 120 || hySpread > 450 || vix > 20) {
      regime = 'CAUTIOUS';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 border-orange-200';
    } else if (igSpread > 80 || hySpread > 300 || vix > 15) {
      regime = 'BALANCED';
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50 border-yellow-200';
    } else {
      regime = 'RISK-ON';
      color = 'text-green-600';
      bgColor = 'bg-green-50 border-green-200';
    }

    const creditStress = (igSpread > 120 || hySpread > 450);
    const equityStress = vix > 20;
    if (creditStress !== equityStress) confidence = 'Moderate';

    let interpretation: string;
    if (regime === 'STRESS' || regime === 'RISK-OFF') {
      interpretation = `Risk aversion building as credit spreads widen to ${igSpread.toFixed(0)}/${hySpread.toFixed(0)} bps (IG/HY) with VIX elevated at ${vix.toFixed(1)}. Credit markets are demanding higher compensation for risk, signaling deteriorating conditions.`;
    } else if (regime === 'RISK-ON') {
      interpretation = `Credit markets remain calm with IG spreads at ${igSpread.toFixed(0)} bps and HY at ${hySpread.toFixed(0)} bps. VIX at ${vix.toFixed(1)} confirms low volatility environment supporting risk assets.`;
    } else {
      interpretation = `Mixed risk signals with credit spreads at ${igSpread.toFixed(0)}/${hySpread.toFixed(0)} bps and VIX at ${vix.toFixed(1)}. Markets showing cautious but not stressed conditions.`;
    }

    return {
      id: 'risk-environment',
      name: 'Risk Environment',
      regime, confidence, interpretation, color, bgColor,
      icon: <Shield className="w-5 h-5" />,
      metrics: { igSpread, hySpread, vix }
    };
  };

  // Policy & Rates Direction Signal
  const calculatePolicyDirection = (): Signal => {
    const { twoYear, fedFunds, sofr } = currentInputs;
    const policyGap = twoYear - fedFunds;
    
    let regime: string, color: string, bgColor: string;
    let confidence: 'High' | 'Moderate' | 'Low' = 'High';
    
    if (policyGap < -0.5) {
      regime = 'AGGRESSIVE EASING EXPECTED';
      color = 'text-blue-700';
      bgColor = 'bg-blue-50 border-blue-200';
    } else if (policyGap < 0) {
      regime = 'CUTS PRICED';
      color = 'text-blue-600';
      bgColor = 'bg-blue-50 border-blue-200';
    } else if (Math.abs(policyGap) <= 0.25) {
      regime = 'NEUTRAL';
      color = 'text-gray-600';
      bgColor = 'bg-gray-50 border-gray-200';
    } else if (policyGap > 0.5) {
      regime = 'AGGRESSIVE TIGHTENING EXPECTED';
      color = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
    } else {
      regime = 'HIKES PRICED';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 border-orange-200';
    }

    const fundingSpread = Math.abs(sofr - fedFunds);
    if (fundingSpread > 0.1) confidence = 'Moderate';

    const cutsOrHikes = policyGap < 0 ? 'cuts' : 'hikes';
    const bpsExpected = Math.abs(policyGap * 100).toFixed(0);
    
    let interpretation: string;
    if (Math.abs(policyGap) > 0.25) {
      interpretation = `Markets pricing ${bpsExpected} bps of ${cutsOrHikes} with 2Y yields at ${twoYear.toFixed(2)}% vs Fed Funds at ${fedFunds.toFixed(2)}%. This ${Math.abs(policyGap * 100).toFixed(0)} bp gap indicates markets expect significant policy changes over the next 12 months.`;
    } else {
      interpretation = `2Y yields at ${twoYear.toFixed(2)}% closely aligned with Fed Funds at ${fedFunds.toFixed(2)}%, suggesting markets agree with current policy stance. Limited policy changes expected near-term.`;
    }

    return {
      id: 'policy-direction',
      name: 'Policy & Rates Direction',
      regime, confidence, interpretation, color, bgColor,
      icon: <Target className="w-5 h-5" />,
      metrics: { twoYear, fedFunds, policyGap, sofr }
    };
  };

  // Bond Market Stress Signal
  const calculateBondStress = (): Signal => {
    const { tenTwoSpread, igSpread, vix, sofr, fedFunds } = currentInputs;
    
    let redFlags = 0;
    const flags: string[] = [];
    
    if (tenTwoSpread < -0.5) { redFlags++; flags.push('Deep curve inversion'); }
    if (igSpread > 150) { redFlags++; flags.push('IG spreads widening'); }
    if (vix > 30) { redFlags++; flags.push('Elevated volatility'); }
    if (Math.abs(sofr - fedFunds) > 0.1) { redFlags++; flags.push('Funding stress'); }
    
    let regime: string, color: string, bgColor: string;
    const confidence: 'High' | 'Moderate' | 'Low' = 'High';
    
    if (redFlags >= 5) {
      regime = 'CRISIS';
      color = 'text-red-800';
      bgColor = 'bg-red-100 border-red-300';
    } else if (redFlags >= 3) {
      regime = 'STRESS';
      color = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
    } else if (redFlags >= 2) {
      regime = 'WARNING';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 border-orange-200';
    } else if (redFlags === 1) {
      regime = 'MONITORING';
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50 border-yellow-200';
    } else {
      regime = 'NORMAL';
      color = 'text-green-600';
      bgColor = 'bg-green-50 border-green-200';
    }

    let interpretation: string;
    if (redFlags === 0) {
      interpretation = `Bond market functioning normally with no stress indicators. All key metrics within normal ranges supporting healthy fixed income conditions.`;
    } else if (redFlags <= 2) {
      interpretation = `Warning signs emerging: ${flags.join(', ')}. While not yet critical, these ${redFlags} indicator${redFlags > 1 ? 's' : ''} warrant monitoring for potential bond market stress.`;
    } else {
      interpretation = `Multiple stress indicators suggest bond market dysfunction risk: ${flags.join(', ')}. ${redFlags} red flags indicate heightened probability of fixed income market disruption.`;
    }

    return {
      id: 'bond-stress',
      name: 'Bond Market Stress',
      regime, confidence, interpretation, color, bgColor,
      icon: <AlertTriangle className="w-5 h-5" />,
      metrics: { redFlags, tenTwoSpread, igSpread, vix }
    };
  };

  // Inflation Expectations Signal
  const calculateInflationExpectations = (): Signal => {
    const { tenYear, thirtyYear, fedFunds } = currentInputs;
    
    let regime: string, color: string, bgColor: string;
    let confidence: 'High' | 'Moderate' | 'Low' = 'High';
    
    if (tenYear < 2 && thirtyYear < 2.5) {
      regime = 'DEFLATION RISK';
      color = 'text-purple-700';
      bgColor = 'bg-purple-50 border-purple-200';
    } else if (tenYear < 3 && thirtyYear < 3.5) {
      regime = 'LOW INFLATION';
      color = 'text-blue-600';
      bgColor = 'bg-blue-50 border-blue-200';
    } else if (tenYear < 4.5 && thirtyYear < 5) {
      regime = 'NORMAL';
      color = 'text-green-600';
      bgColor = 'bg-green-50 border-green-200';
    } else if (tenYear < 5.5 && thirtyYear < 6) {
      regime = 'ELEVATED';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 border-orange-200';
    } else {
      regime = 'HIGH INFLATION';
      color = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
    }

    const realRate = tenYear - 2.5;
    if (realRate < 0) confidence = 'Moderate';

    let interpretation: string;
    if (regime === 'HIGH INFLATION' || regime === 'ELEVATED') {
      interpretation = `10Y yields at ${tenYear.toFixed(2)}% and 30Y at ${thirtyYear.toFixed(2)}% suggest elevated inflation expectations. Despite Fed at ${fedFunds.toFixed(2)}%, long yields indicate inflation concerns persist with real rates at ${realRate.toFixed(1)}%.`;
    } else if (regime === 'DEFLATION RISK' || regime === 'LOW INFLATION') {
      interpretation = `Long yields at ${tenYear.toFixed(2)}%/${thirtyYear.toFixed(2)}% (10Y/30Y) imply low inflation expectations well below Fed's 2% target. Real rates appear elevated, suggesting disinflationary pressures.`;
    } else {
      interpretation = `10Y yields at ${tenYear.toFixed(2)}% imply moderate inflation expectations around Fed's target. 30Y at ${thirtyYear.toFixed(2)}% confirms stable long-term inflation outlook with real rates at ${realRate.toFixed(1)}%.`;
    }

    return {
      id: 'inflation-expectations',
      name: 'Inflation Expectations',
      regime, confidence, interpretation, color, bgColor,
      icon: <DollarSign className="w-5 h-5" />,
      metrics: { tenYear, thirtyYear, realRate }
    };
  };

  // Calculate all signals
  const signals: Signal[] = useMemo(() => [
    calculateEconomicOutlook(),
    calculateRiskEnvironment(),
    calculatePolicyDirection(),
    calculateBondStress(),
    calculateInflationExpectations()
  ], [currentInputs, previousInputs]);

  // Confidence indicator component
  const getConfidenceIndicator = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return <div className="flex space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>;
      case 'Moderate':
        return <div className="flex space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>;
      case 'Low':
        return <div className="flex space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>;
      default:
        return null;
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Market Signals Intelligence</h2>
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Based on 12 FRED Metrics • Real-time Analysis
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {signals.map((signal) => (
          <div key={signal.id} className={`${signal.bgColor} border rounded-lg p-6 transition-all duration-200 hover:shadow-md`}>
            {/* Signal Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${signal.color.replace('text-', 'bg-').replace('-600', '-100')} ${signal.color}`}>
                  {signal.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{signal.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-sm font-medium ${signal.color}`}>
                      {signal.regime}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Confidence Indicator */}
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Confidence</div>
                <div className="flex items-center space-x-2">
                  {getConfidenceIndicator(signal.confidence)}
                  <span className="text-xs text-gray-600">{signal.confidence}</span>
                </div>
              </div>
            </div>

            {/* Interpretation Text */}
            <div className="text-sm text-gray-700 leading-relaxed">
              {signal.interpretation}
            </div>

            {/* Key Metrics Display */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">Key Metrics:</div>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(signal.metrics).map(([key, value]) => (
                  <div key={key} className="bg-white bg-opacity-50 px-2 py-1 rounded">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium ml-1">
                      {typeof value === 'number' ? 
                        (key.includes('Spread') || key.includes('Gap') ? 
                          `${(value * 100).toFixed(0)}bps` : 
                          value.toFixed(2)
                        ) : 
                        value
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Signal Summary</span>
            </div>
        <div className="text-sm text-gray-600">
          {signals.filter(s => s.regime.includes('RISK') || s.regime.includes('STRESS') || s.regime.includes('WARNING')).length > 0 ? 
            `${signals.filter(s => s.regime.includes('RISK') || s.regime.includes('STRESS') || s.regime.includes('WARNING')).length} warning signal(s) detected. Monitor for potential market stress.` :
            'All signals within normal ranges. Market conditions appear stable.'
          }
        </div>
      </div>
    </section>
  );
};

export default MarketSignals; 
