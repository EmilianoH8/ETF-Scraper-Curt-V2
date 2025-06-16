import React from 'react';

const Guide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">How to Read Market Signals</h1>
        
        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Understanding Your Bond Dashboard</h2>
            <p className="text-gray-700 mb-4">
              This dashboard transforms 12 key bond market metrics into 5 clear signals that help you understand what's happening in fixed income markets and the broader economy. Think of it as your bond market translator – taking complex data and making it actionable.
            </p>
          </div>

          {/* The 12 Market Metrics */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The 12 Market Metrics</h2>
            
            {/* Treasury Yields */}
            <div className="mb-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">Treasury Yields</h3>
              <p className="text-gray-700 mb-3"><strong>2-Year, 10-Year, and 30-Year Treasury Yields</strong></p>
              <p className="text-gray-700 mb-4">These are the interest rates the U.S. government pays to borrow money for different time periods.</p>
              
              <ul className="text-sm text-gray-700 space-y-2 mb-4">
                <li><strong>2-Year:</strong> Reflects near-term Fed policy expectations</li>
                <li><strong>10-Year:</strong> The benchmark rate that influences mortgages and corporate borrowing</li>
                <li><strong>30-Year:</strong> Shows long-term economic and inflation expectations</li>
              </ul>
              
              <div className="bg-white rounded p-3 text-sm">
                <p className="text-gray-700">
                  <strong>Higher yields</strong> = Stronger growth or inflation expectations<br/>
                  <strong>Lower yields</strong> = Economic concerns or flight to safety
                </p>
              </div>
            </div>

            {/* Yield Curve Spreads */}
            <div className="mb-6 bg-purple-50 rounded-lg p-6 border border-purple-200">
              <h3 className="text-xl font-semibold text-purple-900 mb-4">Yield Curve Spreads</h3>
              <p className="text-gray-700 mb-3"><strong>10Y-2Y Spread and 30Y-10Y Spread</strong></p>
              <p className="text-gray-700 mb-4">These measure the difference between long and short-term rates.</p>
              
              <ul className="text-sm text-gray-700 space-y-2 mb-4">
                <li><strong>Positive spread:</strong> Normal - investors demand more yield for longer-term loans</li>
                <li><strong>Near zero:</strong> Uncertainty about the future</li>
                <li><strong>Negative (inverted):</strong> Warning sign - often precedes recessions</li>
              </ul>
              
              <div className="bg-white rounded p-3 text-sm">
                <p className="text-gray-700">
                  <strong>The shape of the yield curve is one of the most reliable economic predictors.</strong>
                </p>
              </div>
            </div>

            {/* Market Context Indicators */}
            <div className="mb-6 bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-xl font-semibold text-green-900 mb-4">Market Context Indicators</h3>
              <p className="text-gray-700 mb-3"><strong>S&P 500, VIX, and Dollar Index</strong></p>
              <p className="text-gray-700 mb-4">These provide crucial context for understanding bond movements:</p>
              
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong>S&P 500:</strong> When stocks fall, bonds often rally (flight to safety)</li>
                <li><strong>VIX:</strong> The "fear gauge" - high VIX often means bond buying</li>
                <li><strong>Dollar Index:</strong> Strong dollar attracts foreign investment to U.S. bonds</li>
              </ul>
            </div>

            {/* Policy Rates */}
            <div className="mb-6 bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-xl font-semibold text-orange-900 mb-4">Policy Rates</h3>
              <p className="text-gray-700 mb-3"><strong>Fed Funds Rate and SOFR</strong></p>
              <p className="text-gray-700 mb-4">These are the short-term rates that anchor the entire rate structure:</p>
              
              <ul className="text-sm text-gray-700 space-y-2 mb-4">
                <li><strong>Fed Funds:</strong> The Federal Reserve's main policy tool</li>
                <li><strong>SOFR:</strong> The market-based funding rate</li>
              </ul>
              
              <div className="bg-white rounded p-3 text-sm">
                <p className="text-gray-700">
                  <strong>When these rise, all rates tend to follow.</strong>
                </p>
              </div>
            </div>

            {/* Credit Spreads */}
            <div className="mb-6 bg-red-50 rounded-lg p-6 border border-red-200">
              <h3 className="text-xl font-semibold text-red-900 mb-4">Credit Spreads</h3>
              <p className="text-gray-700 mb-3"><strong>Investment Grade (IG) and High Yield (HY) Spreads</strong></p>
              <p className="text-gray-700 mb-4">These measure the extra yield investors demand for corporate bonds over Treasuries:</p>
              
              <ul className="text-sm text-gray-700 space-y-2 mb-4">
                <li><strong>Tight spreads:</strong> Confidence in corporate health</li>
                <li><strong>Wide spreads:</strong> Concern about defaults and economic stress</li>
              </ul>
              
              <div className="bg-white rounded p-3 text-sm">
                <p className="text-gray-700">
                  <strong>Credit spreads often lead other indicators in signaling problems.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* The 5 Market Signals */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The 5 Market Signals</h2>
            
            <div className="space-y-6">
              {/* Economic Outlook */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-xl font-semibold text-blue-900 mb-3">1. Economic Outlook</h3>
                <p className="text-gray-700 mb-2"><strong>What it tells you:</strong> What bond markets expect for economic growth</p>
                <p className="text-gray-700 mb-2"><strong>Based on:</strong> All yield curve metrics</p>
                <p className="text-gray-700 mb-4"><strong>Time horizon:</strong> 6-18 months ahead</p>
                
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong className="text-green-700">Strong Growth:</strong> Steep yield curve, optimistic outlook</li>
                  <li><strong className="text-blue-700">Moderate Growth:</strong> Normal curve, steady expansion expected</li>
                  <li><strong className="text-yellow-700">Slowdown:</strong> Flattening curve, growth concerns emerging</li>
                  <li><strong className="text-red-700">Recession Risk:</strong> Inverted curve, significant downturn expected</li>
                </ul>
              </div>

              {/* Risk Environment */}
              <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                <h3 className="text-xl font-semibold text-orange-900 mb-3">2. Risk Environment</h3>
                <p className="text-gray-700 mb-2"><strong>What it tells you:</strong> How stressed or calm markets are</p>
                <p className="text-gray-700 mb-2"><strong>Based on:</strong> Credit spreads, VIX, and stock market</p>
                <p className="text-gray-700 mb-4"><strong>Time horizon:</strong> Current conditions to 3 months</p>
                
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong className="text-green-700">Risk-On:</strong> Tight spreads, low volatility, calm markets</li>
                  <li><strong className="text-blue-700">Balanced:</strong> Normal stress levels</li>
                  <li><strong className="text-yellow-700">Cautious:</strong> Spreads widening, volatility rising</li>
                  <li><strong className="text-red-700">Risk-Off:</strong> High stress, flight to quality</li>
                </ul>
              </div>

              {/* Policy & Rates Direction */}
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-xl font-semibold text-purple-900 mb-3">3. Policy & Rates Direction</h3>
                <p className="text-gray-700 mb-2"><strong>What it tells you:</strong> Where interest rates are headed</p>
                <p className="text-gray-700 mb-2"><strong>Based on:</strong> Fed Funds, SOFR, 2Y and 10Y yields</p>
                <p className="text-gray-700 mb-4"><strong>Time horizon:</strong> 3-12 months</p>
                
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong className="text-blue-700">Easing Expected:</strong> Market pricing in rate cuts</li>
                  <li><strong className="text-gray-700">Neutral:</strong> Rates expected to stay steady</li>
                  <li><strong className="text-red-700">Tightening Expected:</strong> Rate hikes anticipated</li>
                </ul>
                
                <div className="bg-white rounded p-3 text-sm mt-3">
                  <p className="text-gray-700">
                    <strong>The gap between 2Y yields and Fed Funds shows what the market expects the Fed to do.</strong>
                  </p>
                </div>
              </div>

              {/* Bond Market Stress */}
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold text-red-900 mb-3">4. Bond Market Stress</h3>
                <p className="text-gray-700 mb-2"><strong>What it tells you:</strong> Whether bond markets are functioning normally</p>
                <p className="text-gray-700 mb-2"><strong>Based on:</strong> Extreme readings across multiple indicators</p>
                <p className="text-gray-700 mb-4"><strong>Time horizon:</strong> Immediate</p>
                
                <div className="bg-white rounded p-3 text-sm">
                  <p className="text-gray-700">
                    This signal counts "red flags" like curve inversions, spread blowouts, and funding stress. More red flags = higher risk of market disruption.
                  </p>
                </div>
              </div>

              {/* Inflation Expectations */}
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <h3 className="text-xl font-semibold text-green-900 mb-3">5. Inflation Expectations</h3>
                <p className="text-gray-700 mb-2"><strong>What it tells you:</strong> What markets expect for future inflation</p>
                <p className="text-gray-700 mb-2"><strong>Based on:</strong> Long-term yields and curve steepness</p>
                <p className="text-gray-700 mb-4"><strong>Time horizon:</strong> 2-10 years</p>
                
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong className="text-blue-700">Low Inflation:</strong> Long yields below 3%</li>
                  <li><strong className="text-green-700">Normal:</strong> Long yields in historical ranges</li>
                  <li><strong className="text-red-700">Elevated:</strong> Rising long-term yields signal inflation concerns</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reading the Signals */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reading the Signals</h2>

            {/* Confidence Levels */}
            <div className="mb-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Confidence Levels</h3>
              <p className="text-gray-700 mb-4">Each signal comes with a confidence indicator:</p>
              
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong className="text-green-700">High:</strong> All indicators agree</li>
                <li><strong className="text-yellow-700">Moderate:</strong> Most indicators align</li>
                <li><strong className="text-red-700">Low:</strong> Mixed or conflicting signals</li>
              </ul>
            </div>

            {/* When Signals Disagree */}
            <div className="mb-6 bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-xl font-semibold text-yellow-900 mb-4">When Signals Disagree</h3>
              <p className="text-gray-700 mb-4">Sometimes signals conflict – this is valuable information:</p>
              
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong>Economic Outlook bearish but Risk Environment calm?</strong> Markets may be complacent</li>
                <li><strong>Rates Direction up but Bond Stress high?</strong> Fed may need to pause</li>
              </ul>
            </div>

            {/* Rate of Change Matters */}
            <div className="mb-6 bg-indigo-50 rounded-lg p-6 border border-indigo-200">
              <h3 className="text-xl font-semibold text-indigo-900 mb-4">Rate of Change Matters</h3>
              <p className="text-gray-700 mb-4">It's not just the level, but the speed of change:</p>
              
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong>Rapid moves</strong> signal urgent shifts in sentiment</li>
                <li><strong>Gradual changes</strong> suggest orderly transitions</li>
              </ul>
            </div>
          </div>

          {/* Using Signals Together */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Using Signals Together</h2>
            <p className="text-gray-700 mb-4">The signals work best as a system:</p>
            
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <ul className="text-gray-700 space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">1.</span>
                  <span><strong>Check Economic Outlook</strong> for the big picture</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">2.</span>
                  <span><strong>Use Risk Environment</strong> for timing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">3.</span>
                  <span><strong>Consider Policy Direction</strong> for rate exposure</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">4.</span>
                  <span><strong>Monitor Bond Stress</strong> for warning signs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">5.</span>
                  <span><strong>Watch Inflation Expectations</strong> for long-term positioning</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide; 