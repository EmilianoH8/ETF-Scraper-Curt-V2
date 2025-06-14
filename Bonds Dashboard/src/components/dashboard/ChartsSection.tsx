import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, ReferenceArea } from 'recharts';
import { DashboardData } from '../../types/bonds';

interface ChartsSectionProps {
  data: DashboardData;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ data }) => {
  const [showOverlays, setShowOverlays] = useState(true);

  // Utility functions for interpretive analysis
  const calculateRecessionProbability = (spread: number) => {
    if (spread < -0.5) return { level: "High", color: "text-red-600", bgColor: "bg-red-100" };
    if (spread < 0) return { level: "Medium", color: "text-orange-600", bgColor: "bg-orange-100" };
    if (spread < 0.5) return { level: "Low-Medium", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { level: "Low", color: "text-green-600", bgColor: "bg-green-100" };
  };

  const getSpreadStatus = (spread: number) => {
    if (spread < 0) return "Inverted";
    if (spread < 1.0) return "Flat";
    return "Normal";
  };

  const getTrendDirection = (data: any[]) => {
    if (data.length < 5) return "Stable";
    const recent = data.slice(-5);
    const trend = recent[recent.length - 1].yield - recent[0].yield;
    if (trend > 0.05) return "Rising";
    if (trend < -0.05) return "Falling";
    return "Stable";
  };

  const calculatePercentile = (currentValue: number, min: number = 0.5, max: number = 5.0) => {
    const percentile = ((currentValue - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentile)));
  };

  const getMunicipalInsight = (spread: number, tenYearYield: number, trend: string) => {
    if (spread < 0 && calculateRecessionProbability(spread).level === "High") {
      return "⚠️ Monitor state revenues - recession risk elevated";
    }
    if (spread > 1.0 && trend === "Falling") {
      return "✅ Favorable for duration positioning";
    }
    if (spread > 0.5 && spread < 1.5) {
      return "📈 Credit spread compression environment";
    }
    if (tenYearYield > 4.5) {
      return "🔍 High rate environment - evaluate refinancing opportunities";
    }
    return "📊 Monitor curve dynamics for positioning";
  };

  // 1. YIELD CURVE DATA - Current vs Historical with inversion detection
  const yieldCurveData = data.yieldCurve.map((point, index, array) => {
    const current = point.yield;
    const oneMonthAgo = point.yield + (Math.random() - 0.5) * 0.3;
    const oneYearAgo = point.yield + (Math.random() - 0.5) * 0.8;
    
    // Check for inversion (current yield lower than previous shorter maturity)
    const isInverted = index > 0 && current < array[index - 1].yield;
    
    return {
      maturity: point.maturity,
      months: point.months,
      current,
      oneMonthAgo,
      oneYearAgo,
      isInverted
    };
  }).sort((a, b) => a.months - b.months);

  // 2. 2s/10s SPREAD TREND DATA - 6 months daily
  const generateSpreadData = () => {
    const days = 180;
    const currentSpread = data.yieldSpreads.find(s => s.name === '10Y-2Y Spread')?.value || -0.09;
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const variation = (Math.random() - 0.5) * 0.1;
      const spread = currentSpread + variation;
      
      return {
        date: date.toISOString().split('T')[0],
        spread: Number(spread.toFixed(3)),
        isInverted: spread < 0,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  };

  // 3. 10-YEAR TREASURY DATA - 6 months with moving average and Fed meetings
  const generate10YearData = () => {
    const days = 180;
    const current10Y = data.treasuryYields.find(y => y.maturity === '10Y')?.yield || 4.19;
    
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const variation = (Math.random() - 0.5) * 0.3;
      
      // Mock Fed meeting dates (typically 8 per year)
      const isFedMeeting = [15, 45, 75, 105, 135, 165].includes(i);
      
      return {
        date: date.toISOString().split('T')[0],
        yield: Number((current10Y + variation).toFixed(3)),
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isFedMeeting,
        fedDecision: isFedMeeting ? (Math.random() > 0.5 ? "+25bps" : "Hold") : null
      };
    });

    // Calculate 20-day moving average
    return dailyData.map((item, index) => {
      const start = Math.max(0, index - 19);
      const slice = dailyData.slice(start, index + 1);
      const ma20 = slice.reduce((sum, d) => sum + d.yield, 0) / slice.length;
      
      return {
        ...item,
        ma20: Number(ma20.toFixed(3))
      };
    });
  };

  const spreadData = generateSpreadData();
  const tenYearData = generate10YearData();
  const currentSpread = spreadData[spreadData.length - 1]?.spread || 0;
  const current10Y = tenYearData[tenYearData.length - 1]?.yield || 4.19;
  const recessionProb = calculateRecessionProbability(currentSpread);
  const spreadStatus = getSpreadStatus(currentSpread);
  const trend = getTrendDirection(tenYearData);
  const percentile = calculatePercentile(current10Y);
  const municipalInsight = getMunicipalInsight(currentSpread, current10Y, trend);

  // Enhanced tooltips
  const YieldCurveTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-medium text-gray-900 mb-2">{label} Maturity</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm mb-1" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}%
            </p>
          ))}
          {data?.isInverted && (
            <p className="text-xs text-red-600 mt-2 font-medium">
              🔴 Inverted: Curve shows inversion at this maturity
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const SpreadTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const value = payload[0]?.value;
      const prob = calculateRecessionProbability(value);
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-medium text-gray-900 mb-2">{data?.displayDate}</p>
          <p className="text-sm mb-1" style={{ color: payload[0]?.color }}>
            2s/10s Spread: {value?.toFixed(3)}%
          </p>
          <p className="text-xs text-gray-600 mb-1">
            Status: {getSpreadStatus(value)}
          </p>
          <p className={`text-xs ${prob.color} font-medium`}>
            Recession Risk: {prob.level}
          </p>
        </div>
      );
    }
    return null;
  };

  const TenYearTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-medium text-gray-900 mb-2">{data?.displayDate}</p>
          <p className="text-sm text-blue-600 mb-1">
            10Y Yield: {data?.yield?.toFixed(3)}%
          </p>
          <p className="text-sm text-gray-600 mb-1">
            20-Day MA: {data?.ma20?.toFixed(3)}%
          </p>
          <p className="text-xs text-gray-600 mb-1">
            Percentile: {calculatePercentile(data?.yield)}th since 2020
          </p>
          {data?.isFedMeeting && (
            <div className="mt-2 p-2 bg-purple-50 rounded">
              <p className="text-xs text-purple-600 font-medium">📅 Fed Meeting</p>
              <p className="text-xs text-purple-600">Decision: {data?.fedDecision}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Toggle Overlays Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Market Analysis Charts</h2>
        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          {showOverlays ? 'Hide' : 'Show'} Overlays
        </button>
      </div>

      {/* Municipal Insight Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <div className="text-blue-600 text-sm font-medium">
            Municipal Bond Insight: {municipalInsight}
          </div>
        </div>
      </div>

      {/* 1. YIELD CURVE - Current vs Historical with Inversion Detection */}
      <div className="chart-container relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">US Treasury Yield Curve</h3>
            <p className="text-sm text-gray-600">Current vs. 1 Month vs. 1 Year Ago</p>
          </div>
          
          {/* Recession Probability Gauge */}
          {showOverlays && (
            <div className={`p-3 rounded-lg ${recessionProb.bgColor} border`}>
              <div className="text-xs text-gray-600 mb-1">Recession Probability</div>
              <div className={`text-sm font-bold ${recessionProb.color}`}>
                {recessionProb.level}
              </div>
              <div className="flex mt-2 space-x-1">
                <div className={`w-2 h-2 rounded-full ${recessionProb.level === 'Low' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-2 rounded-full ${recessionProb.level === 'Low-Medium' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-2 rounded-full ${recessionProb.level === 'Medium' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-2 rounded-full ${recessionProb.level === 'High' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yieldCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="maturity" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft' }}
                domain={[0, 6]}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip content={<YieldCurveTooltip />} />
              
              {/* Current Yield Curve - Bold Blue */}
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#2563eb" 
                strokeWidth={4}
                dot={(props: any) => {
                  const { payload } = props;
                  if (payload?.isInverted) {
                    return <circle cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />;
                  }
                  return <circle cx={props.cx} cy={props.cy} r={5} fill="#2563eb" strokeWidth={2} />;
                }}
                name="Current"
              />
              
              {/* 1 Month Ago - Dashed Orange */}
              <Line 
                type="monotone" 
                dataKey="oneMonthAgo" 
                stroke="#f59e0b" 
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ fill: '#f59e0b', strokeWidth: 1, r: 3 }}
                name="1 Month Ago"
              />
              
              {/* 1 Year Ago - Dotted Purple */}
              <Line 
                type="monotone" 
                dataKey="oneYearAgo" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={{ fill: '#8b5cf6', strokeWidth: 1, r: 3 }}
                name="1 Year Ago"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-blue-600"></div>
              <span>━━━ Current (Bold Blue)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-amber-500" style={{backgroundImage: 'repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 8px, transparent 8px, transparent 12px)'}}></div>
              <span>- - - 1 Month Ago (Orange)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-violet-500" style={{backgroundImage: 'repeating-linear-gradient(to right, #8b5cf6 0, #8b5cf6 2px, transparent 2px, transparent 6px)'}}></div>
              <span>··· 1 Year Ago (Purple)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>🔴 Inversion Points</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 2s/10s SPREAD TREND - 6 months with Background Zones */}
      <div className="chart-container relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">2s/10s Spread Trend</h3>
            <p className="text-sm text-gray-600">6-Month Daily Data • Background Zones Show Curve Status</p>
          </div>
          
          {/* Context Information Box */}
          {showOverlays && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm max-w-xs">
              <div className="font-medium text-gray-900 mb-2">Historical Context:</div>
              <div className="space-y-1 text-xs">
                <div>• Normal Range: 1.0% - 1.5%</div>
                <div>• Current: <span className="font-semibold">{currentSpread.toFixed(3)}%</span></div>
                <div>• Status: <span className={`font-semibold ${spreadStatus === 'Inverted' ? 'text-red-600' : spreadStatus === 'Flat' ? 'text-yellow-600' : 'text-green-600'}`}>{spreadStatus}</span></div>
                <div>• Recession Probability: <span className={`font-semibold ${recessionProb.color}`}>{recessionProb.level}</span></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spreadData}>
              <defs>
                <linearGradient id="positiveSpread" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="negativeSpread" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              
              {/* Background Color Zones */}
              {showOverlays && (
                <>
                  <ReferenceArea y1={1.0} y2={3.0} fill="#10b981" fillOpacity={0.1} />
                  <ReferenceArea y1={0} y2={1.0} fill="#fbbf24" fillOpacity={0.1} />
                  <ReferenceArea y1={-2.0} y2={0} fill="#ef4444" fillOpacity={0.1} />
                </>
              )}
              
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                label={{ value: 'Spread (%)', angle: -90, position: 'insideLeft' }}
                domain={[-1, 2]}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip content={<SpreadTooltip />} />
              
              {/* Critical Level Lines */}
              {showOverlays && (
                <>
                  <ReferenceLine y={0} stroke="#ef4444" strokeWidth={3} strokeDasharray="4 4" />
                  <ReferenceLine y={1.0} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 2" />
                </>
              )}
              
              {/* Spread Area Chart */}
              <Area 
                type="monotone" 
                dataKey="spread" 
                stroke="#10b981"
                fill="url(#positiveSpread)"
                strokeWidth={2}
                name="2s/10s Spread"
              />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Zone Labels */}
          {showOverlays && (
            <div className="absolute top-4 left-4 space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-200 border border-green-400"></div>
                <span className="text-green-700 font-medium">Normal Curve (&gt;1.0%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-200 border border-yellow-400"></div>
                <span className="text-yellow-700 font-medium">Flat Curve (0-1.0%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-200 border border-red-400"></div>
                <span className="text-red-700 font-medium">Inverted - Recession Risk (&lt;0%)</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-600">
            Current Spread: <span className={`font-semibold ${currentSpread < 0 ? 'text-red-600' : currentSpread < 1.0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {currentSpread.toFixed(3)}%
            </span>
          </div>
          {currentSpread < 0 && (
            <div className="text-sm text-red-600 font-medium">
              ⚠️ Inverted Yield Curve - Historical recession indicator
            </div>
          )}
        </div>
      </div>

      {/* 3. 10-YEAR TREASURY - 6 months with Percentile Bands */}
      <div className="chart-container relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">10-Year Treasury Yield</h3>
            <p className="text-sm text-gray-600">6-Month Daily Data • Percentile Bands • Fed Meeting Dates</p>
          </div>
          
          {/* Historical Context Box */}
          {showOverlays && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm max-w-xs">
              <div className="font-medium text-gray-900 mb-2">Rate Environment:</div>
              <div className="space-y-1 text-xs">
                <div>• 5Y High: 5.0% (Oct 2023)</div>
                <div>• 5Y Low: 0.5% (Aug 2020)</div>
                <div>• Current: <span className="font-semibold">{current10Y.toFixed(3)}%</span></div>
                <div>• Percentile: <span className="font-semibold">{percentile}th</span> since 2020</div>
                <div>• Trend: <span className={`font-semibold ${trend === 'Rising' ? 'text-red-600' : trend === 'Falling' ? 'text-green-600' : 'text-gray-600'}`}>{trend}</span></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tenYearData}>
              {/* Percentile Bands */}
              {showOverlays && (
                <>
                  <ReferenceArea y1={4.5} y2={6.0} fill="#fecaca" fillOpacity={0.3} />
                  <ReferenceArea y1={3.5} y2={4.5} fill="#f3f4f6" fillOpacity={0.3} />
                  <ReferenceArea y1={0} y2={3.5} fill="#dcfce7" fillOpacity={0.3} />
                </>
              )}
              
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft' }}
                domain={[2, 6]}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip content={<TenYearTooltip />} />
              
              {/* Reference Lines for Percentile Bands */}
              {showOverlays && (
                <>
                  <ReferenceLine y={4.5} stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" />
                  <ReferenceLine y={3.5} stroke="#10b981" strokeWidth={1} strokeDasharray="2 2" />
                </>
              )}
              
              {/* 20-Day Moving Average - Orange */}
              <Line 
                type="monotone" 
                dataKey="ma20" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={false}
                name="20-Day MA"
                strokeDasharray="6 2"
              />
              
              {/* Daily 10Y Yield - Blue with Fed Meeting Markers */}
              <Line 
                type="monotone" 
                dataKey="yield" 
                stroke="#2563eb" 
                strokeWidth={3}
                dot={(props: any) => {
                  const { payload } = props;
                  if (payload?.isFedMeeting) {
                    return <circle cx={props.cx} cy={props.cy} r={6} fill="#7c3aed" stroke="#ffffff" strokeWidth={2} />;
                  }
                  return <circle cx={props.cx} cy={props.cy} r={2} fill="#2563eb" />;
                }}
                name="10Y Yield"
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Percentile Band Labels */}
          {showOverlays && (
            <div className="absolute top-4 right-4 space-y-1 text-xs text-right">
              <div className="flex items-center justify-end space-x-2">
                <span className="text-red-700 font-medium">High End (&gt;4.5%)</span>
                <div className="w-3 h-3 bg-red-200 border border-red-400"></div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <span className="text-gray-700 font-medium">Normal Range (3.5-4.5%)</span>
                <div className="w-3 h-3 bg-gray-200 border border-gray-400"></div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <span className="text-green-700 font-medium">Low End (&lt;3.5%)</span>
                <div className="w-3 h-3 bg-green-200 border border-green-400"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-blue-600"></div>
              <span>10Y Daily Yield</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-amber-500" style={{backgroundImage: 'repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 6px, transparent 6px, transparent 8px)'}}></div>
              <span>20-Day Moving Average</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              <span>Fed Meeting Dates</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Current 10Y Yield: <span className="font-semibold text-blue-600">
              {current10Y.toFixed(3)}%
            </span> • 
            <span className={`ml-2 font-semibold ${trend === 'Rising' ? 'text-red-600' : trend === 'Falling' ? 'text-green-600' : 'text-gray-600'}`}>
              {trend} Trend
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection; 