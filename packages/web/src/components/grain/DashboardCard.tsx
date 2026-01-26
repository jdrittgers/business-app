import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    label: string;
  };
  index?: number; // For staggered animations
}

export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  trend,
  index = 0
}: DashboardCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div
      className="glass-card p-5 sm:p-6 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500/80 uppercase tracking-wide truncate">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <div className="mt-3 flex items-center text-sm">
              <span className={`font-medium ${trend.value >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl flex-shrink-0 glass-subtle ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
