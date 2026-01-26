import { useState, useEffect } from 'react';

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  color?: 'green' | 'blue' | 'yellow' | 'red';
  showDetails?: boolean;
}

export default function ProgressBar({
  label,
  current,
  total,
  color = 'green',
  showDetails = true
}: ProgressBarProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const remaining = Math.max(total - current, 0);

  // Trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  const glowClasses = {
    green: 'shadow-glow-green',
    blue: 'shadow-glow-blue',
    yellow: '',
    red: ''
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{percentage.toFixed(1)}%</span>
      </div>

      <div className="w-full glass-subtle rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClasses[color]} ${percentage >= 100 ? glowClasses[color] : ''} transition-all duration-1000 ease-out`}
          style={{ width: isAnimated ? `${percentage}%` : '0%' }}
        />
      </div>

      {showDetails && (
        <div className="flex justify-between text-xs text-gray-600">
          <span>
            Sold: <span className="font-semibold text-gray-900">{current.toLocaleString()}</span> bu
          </span>
          <span>
            Remaining: <span className="font-semibold text-gray-900">{remaining.toLocaleString()}</span> bu
          </span>
          <span>
            Total: <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> bu
          </span>
        </div>
      )}
    </div>
  );
}
