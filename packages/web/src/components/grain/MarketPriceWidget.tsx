import { useState, useEffect } from 'react';
import { CommodityType } from '@business-app/shared';
import { marketPriceApi } from '../../api/market-price.api';

export default function MarketPriceWidget() {
  const [prices, setPrices] = useState<{ [key in CommodityType]?: number }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      const latestPrices = await marketPriceApi.getLatestPrices();
      setPrices(latestPrices);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching market prices:', err);
      setError('Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const commodityIcons = {
    CORN: '🌽',
    SOYBEANS: '🫘',
    WHEAT: '🌾'
  };

  const commodityLabels = {
    CORN: 'Corn',
    SOYBEANS: 'Soybeans',
    WHEAT: 'Wheat'
  };

  if (loading && !lastUpdated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Prices</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Live Market Prices</h3>
        <button
          onClick={fetchPrices}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {(['CORN', 'SOYBEANS', 'WHEAT'] as CommodityType[]).map((commodity) => (
          <div
            key={commodity}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{commodityIcons[commodity]}</span>
              <span className="font-medium text-gray-700">{commodityLabels[commodity]}</span>
            </div>
            <div className="text-right">
              {prices[commodity] ? (
                <>
                  <div className="text-xl font-bold text-gray-900">
                    ${prices[commodity]?.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">/bushel</div>
                </>
              ) : (
                <span className="text-sm text-gray-400">No data</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {lastUpdated && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
