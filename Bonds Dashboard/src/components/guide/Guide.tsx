import React from 'react';

const Guide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Market Signals Interpretation Guide</h1>
        
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Overview</h2>
          <p className="text-gray-700 mb-6">
            This guide explains how to interpret the four key market indicators and their movements to generate accurate market signals.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Yield Curve Section */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
                <span className="mr-2">📈</span>
                1. Yield Curve (10Y-2Y Spread)
              </h3>
              
              <h4 className="font-semibold text-gray-900 mb-2">What it measures</h4>
              <p className="text-gray-700 mb-4">
                The difference between 10-year and 2-year Treasury yields. A key predictor of economic growth and recession risk.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">Interpretation</h4>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li><strong className="text-green-700">Positive spread (&gt;0)</strong>: Normal curve - healthy growth expectations</li>
                <li><strong className="text-yellow-700">Near zero (0 to 0.5)</strong>: Flattening curve - slowing growth</li>
                <li><strong className="text-red-700">Negative spread (&lt;0)</strong>: Inverted curve - recession risk within 12-18 months</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Movement Analysis</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Steepening (+0.10+)</strong>: Recovery expectations or inflation concerns</li>
                <li><strong>Flattening (-0.10+)</strong>: Growth concerns, Fed tightening expectations</li>
                <li><strong>Small moves (±0.05)</strong>: Normal market fluctuations</li>
              </ul>
            </div>

            {/* Fed Policy Section */}
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <h3 className="text-xl font-semibold text-purple-900 mb-4 flex items-center">
                <span className="mr-2">🏦</span>
                2. Fed Policy Stance (Fed Funds Rate)
              </h3>
              
              <h4 className="font-semibold text-gray-900 mb-2">What it measures</h4>
              <p className="text-gray-700 mb-4">
                The current Federal Funds rate, indicating monetary policy stance.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">Interpretation</h4>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li><strong className="text-green-700">Low rates (&lt;2%)</strong>: Accommodative policy, supporting growth</li>
                <li><strong className="text-blue-700">Neutral rates (2-3%)</strong>: Balanced policy</li>
                <li><strong className="text-orange-700">High rates (&gt;4%)</strong>: Restrictive policy, fighting inflation</li>
                <li><strong className="text-red-700">Very high rates (&gt;5%)</strong>: Aggressive tightening</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Movement Analysis</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Rate hikes (+0.25+)</strong>: Tightening cycle, inflation concerns</li>
                <li><strong>Rate cuts (-0.25+)</strong>: Easing cycle, growth concerns</li>
                <li><strong>Unchanged</strong>: Policy on hold, watching data</li>
              </ul>
            </div>

            {/* Credit Risk Section */}
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-xl font-semibold text-orange-900 mb-4 flex items-center">
                <span className="mr-2">💳</span>
                3. Credit Risk (Credit Spread Index)
              </h3>
              
              <h4 className="font-semibold text-gray-900 mb-2">What it measures</h4>
              <p className="text-gray-700 mb-4">
                The spread between corporate bonds and risk-free Treasuries. Indicates market stress and default risk.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">Interpretation</h4>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li><strong className="text-green-700">Tight spreads (&lt;1.0)</strong>: Low credit stress, risk-on environment</li>
                <li><strong className="text-blue-700">Normal spreads (1.0-2.0)</strong>: Balanced conditions</li>
                <li><strong className="text-orange-700">Wide spreads (2.0-3.0)</strong>: Elevated credit concerns</li>
                <li><strong className="text-red-700">Very wide spreads (&gt;3.0)</strong>: Significant stress, possible crisis</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Movement Analysis</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Tightening (-0.10+)</strong>: Improving conditions, risk appetite increasing</li>
                <li><strong>Widening (+0.10+)</strong>: Credit stress building, risk-off sentiment</li>
              </ul>
            </div>

            {/* Market Volatility Section */}
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <h3 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
                <span className="mr-2">⚡</span>
                4. Market Volatility (VIX)
              </h3>
              
              <h4 className="font-semibold text-gray-900 mb-2">What it measures</h4>
              <p className="text-gray-700 mb-4">
                Expected 30-day volatility in the S&P 500. Known as the "fear gauge."
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">Interpretation</h4>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li><strong className="text-green-700">Low VIX (&lt;15)</strong>: Complacency, low fear</li>
                <li><strong className="text-blue-700">Normal VIX (15-20)</strong>: Balanced market</li>
                <li><strong className="text-orange-700">Elevated VIX (20-30)</strong>: Increased uncertainty</li>
                <li><strong className="text-red-700">High VIX (&gt;30)</strong>: Significant fear/stress</li>
                <li><strong className="text-red-800">Extreme VIX (&gt;40)</strong>: Panic conditions</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Movement Analysis</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Spike up (+5+)</strong>: Immediate stress event, risk-off move</li>
                <li><strong>Drift higher (+2-5)</strong>: Building uncertainty, caution warranted</li>
                <li><strong>Decline (-5+)</strong>: Calming conditions, risk appetite returning</li>
              </ul>
            </div>
          </div>

          {/* Signal Interpretation Rules */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Signal Interpretation Rules</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Convergence Analysis</h3>
                <p className="text-gray-700 mb-2">When multiple indicators align:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong className="text-green-700">All bullish</strong>: Strong risk-on signal</li>
                  <li><strong className="text-red-700">All bearish</strong>: Strong risk-off signal</li>
                  <li><strong className="text-yellow-700">Mixed</strong>: Requires nuanced interpretation</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Divergence Warnings</h3>
                <p className="text-gray-700 mb-2">When indicators conflict:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Yield curve bullish + Credit spreads widening</strong>: Credit markets see risks</li>
                  <li><strong>VIX low + Credit spreads wide</strong>: Equity complacency vs bond caution</li>
                  <li><strong>Fed easing + VIX rising</strong>: Policy response to emerging stress</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Magnitude Matters</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Small moves: Look for confirmation from others</li>
                  <li>Large moves: Can override mixed signals</li>
                  <li>Extreme readings: Often mark turning points</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Timeframe Considerations</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Yield Curve</strong>: Leads by 12-18 months</li>
                  <li><strong>Credit Spreads</strong>: 3-6 month indicator</li>
                  <li><strong>VIX</strong>: Real-time to 30-day forward</li>
                  <li><strong>Fed Policy</strong>: Current with 6-12 month impact lag</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Market Signal Categories */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-8">
            <h2 className="text-2xl font-semibold text-blue-900 mb-4">Market Signal Categories</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Overall Market Sentiment</h3>
                <p className="text-gray-700 text-sm">
                  Synthesizes all four indicators into a single market view, weighted by extremity and agreement.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">📈 Growth vs Recession Signal</h3>
                <p className="text-gray-700 text-sm">
                  Assesses economic growth trajectory and recession probability (6-18 months forward). 
                  Primary inputs: Yield Curve + Fed Policy.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🏦 Financial Conditions</h3>
                <p className="text-gray-700 text-sm">
                  Evaluates if monetary policy and credit markets are supporting or restricting growth. 
                  Primary inputs: Fed Policy + Credit Risk.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">⚡ Risk Sentiment</h3>
                <p className="text-gray-700 text-sm">
                  Gauges current investor risk appetite and positioning (real-time to 1 month). 
                  Primary inputs: Credit Risk + Market Volatility.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">⚠️ Key Divergences</h3>
                <p className="text-gray-700 text-sm">
                  Explicitly flags when indicators send conflicting signals, with warning levels from None to Critical.
                </p>
              </div>
            </div>
          </div>

          {/* Key Relationships */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h2 className="text-2xl font-semibold text-green-900 mb-4">Key Market Relationships</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🟢 Risk-On Cascade</h3>
                <p className="text-sm text-gray-700">
                  Fed easing → Yield curve steepens → Credit spreads tighten → VIX falls
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🔴 Risk-Off Cascade</h3>
                <p className="text-sm text-gray-700">
                  Credit stress → VIX spikes → Fed responds → Yield curve flattens
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🟡 Late Cycle</h3>
                <p className="text-sm text-gray-700">
                  Fed tightening → Yield curve flattens → Credit spreads widen → VIX rises
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🟢 Recovery</h3>
                <p className="text-sm text-gray-700">
                  Fed easing → Credit spreads peak → VIX peaks → Yield curve steepens
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide; 