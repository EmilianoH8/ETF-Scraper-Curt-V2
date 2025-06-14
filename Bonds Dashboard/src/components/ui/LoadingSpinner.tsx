import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-neutral-blue animate-spin mb-2" />
      <p className="text-sm text-financial-gray">Loading market data...</p>
    </div>
  );
};

export default LoadingSpinner; 