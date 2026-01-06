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
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const remaining = Math.max(total - current, 0);

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
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
