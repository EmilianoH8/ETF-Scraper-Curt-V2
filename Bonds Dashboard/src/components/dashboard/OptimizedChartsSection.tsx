import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardData } from '../../types/bonds';

interface OptimizedChartsSectionProps {
  data: DashboardData;
}

const OptimizedChartsSection: React.FC<OptimizedChartsSectionProps> = ({ data }) => {
  // Simplified yield curve data (no historical comparison)
  const yieldCurveData = useMemo(() => {
    return data.yieldCurve.map((point, index, array) => {
      const isInverted = index > 0 && point.yield < array[index - 1].yield;
      return {
        maturity: point.maturity,
        months: point.months,
        yield: point.yield,
        isInverted
      };
    }).sort((a, b) => a.months - b.months);
  }, [data.yieldCurve]);

  // Quick calculations from current data only
  const currentSpread = data.yieldSpreads.find(s => s.name === '10Y-2Y Spread')?.value || 0;
  const curveStatus = currentSpread < 0 ? "Inverted" : currentSpread < 1.0 ? "Flat" : "Normal";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Market Analysis Charts</h2>
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            📊 Current Market Data
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Current Yield Curve */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Yield Curve</h3>
            <p className="text-sm text-gray-600">Treasury Yields by Maturity</p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="maturity" 
                  tick={{ fontSize: 11 }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  domain={[0, 6]}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(2)}%`, 'Yield']}
                  labelFormatter={(label) => `${label} Treasury`}
                />
                <Line 
                  type="monotone" 
                  dataKey="yield" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { payload } = props;
                    return (
                      <circle 
                        cx={props.cx} 
                        cy={props.cy} 
                        r={payload?.isInverted ? 6 : 4} 
                        fill={payload?.isInverted ? "#ef4444" : "#2563eb"}
                        stroke="#ffffff" 
                        strokeWidth={2} 
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            Status: <span className={`font-semibold ${curveStatus === 'Inverted' ? 'text-red-600' : curveStatus === 'Flat' ? 'text-yellow-600' : 'text-green-600'}`}>
              {curveStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Key Insights Row */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <div className="text-blue-600 text-sm">
          <strong>Market Insight:</strong> {
            currentSpread < 0 ? 
            "⚠️ Inverted yield curve signals elevated recession risk. Monitor credit spreads and Fed policy closely." :
            currentSpread < 1.0 ?
            "📊 Flattening yield curve suggests economic uncertainty. Watch for further inversion signals." :
            "✅ Normal yield curve shape supports growth expectations. Favorable environment for duration strategies."
          }
        </div>
      </div>
    </div>
  );
};

export default OptimizedChartsSection; 