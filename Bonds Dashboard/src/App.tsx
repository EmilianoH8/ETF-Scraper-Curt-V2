import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { DashboardData } from './types/bonds';
import { fredApiService } from './services/fredApi';
import MetricsGrid from './components/dashboard/MetricsGrid';
import OptimizedChartsSection from './components/dashboard/OptimizedChartsSection';
import InterpretationPanel from './components/dashboard/InterpretationPanel';
import MarketSignals from './components/signals/MarketSignals';
import Guide from './components/guide/Guide';
import LoadingSpinner from './components/ui/LoadingSpinner';

type ActiveTab = 'dashboard' | 'guide';

const App: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch real data, fallback to mock data if API key is not available
      let data: DashboardData;
      try {
        data = await fredApiService.getDashboardData();
        setIsUsingMockData(data.dataSource === 'mock');
      } catch (apiError) {
        console.warn('FRED API unavailable, using mock data:', apiError);
        data = fredApiService.getMockData();
        setIsUsingMockData(true);
      }
      
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = (): void => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 15 minutes during market hours (9 AM - 4 PM ET)
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const isMarketHours = hour >= 9 && hour <= 16;
      
      if (isMarketHours) {
        fetchData();
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-bear-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-neutral-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Data Source Indicator */}
      {dashboardData && (
        <div className={`${
          isUsingMockData 
            ? 'bg-yellow-100 border-yellow-200 text-yellow-800' 
            : 'bg-green-100 border-green-200 text-green-800'
        } border-b px-4 py-2`}>
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isUsingMockData ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="text-sm font-medium">
                {isUsingMockData 
                  ? '⚠️ Using Mock Data - Backend Server Not Connected' 
                  : '✅ Live FRED Data - Real-time Market Information'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-4 sm:py-0">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bond Market Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600">JPM Asset Management Municipal Research</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {activeTab === 'dashboard' && (
                <>
                  <div className="text-sm text-gray-600 order-2 sm:order-1">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors order-1 sm:order-2 ${
                      loading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-neutral-blue text-white hover:bg-blue-600'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200 pt-4 pb-4 sm:pb-0">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-neutral-blue text-neutral-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Market Dashboard
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'guide'
                    ? 'border-neutral-blue text-neutral-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Interpretation Guide
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6 sm:py-8">
        {activeTab === 'dashboard' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {dashboardData && (
              <div className="space-y-6 sm:space-y-8">
                {/* Metrics Grid */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Changes: Day-over-Day
                    </div>
                  </div>
                  <MetricsGrid data={dashboardData} />
                </section>

                {/* Market Analysis Charts */}
                <section>
                  <OptimizedChartsSection data={dashboardData} />
                </section>

                {/* Market Signals */}
                <section>
                  <MarketSignals data={dashboardData} />
                </section>

                {/* Interpretation Panel */}
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Analysis</h2>
                  <InterpretationPanel data={dashboardData} />
                </section>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-bear-red mr-2" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Guide />
        )}
      </main>
    </div>
  );
};

export default App; 