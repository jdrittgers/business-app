import React from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  className?: string;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  mobileCardRenderer?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export default function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  mobileCardRenderer,
  emptyMessage = 'No data available',
  className = ''
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const getValue = (item: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj: any, k) => obj?.[k], item);
    }
    return (item as any)[key];
  };

  return (
    <div className={className}>
      {/* Mobile Card View */}
      {mobileCardRenderer && (
        <div className="md:hidden space-y-4">
          {data.map((item) => (
            <div key={keyExtractor(item)}>
              {mobileCardRenderer(item)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      <div className={mobileCardRenderer ? 'hidden md:block' : 'block'}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.hideOnMobile ? 'hidden sm:table-cell' : ''
                    } ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td
                      key={`${keyExtractor(item)}-${String(column.key)}`}
                      className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 ${
                        column.hideOnMobile ? 'hidden sm:table-cell' : ''
                      } ${column.className || ''}`}
                    >
                      {column.render
                        ? column.render(item)
                        : getValue(item, column.key)?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Mobile Card component for common use cases
interface MobileCardProps {
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  };
  details: Array<{ label: string; value: React.ReactNode }>;
  actions?: React.ReactNode;
}

export function MobileCard({ title, subtitle, status, details, actions }: MobileCardProps) {
  const statusColors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {status && (
          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status.color]}`}>
            {status.label}
          </span>
        )}
      </div>

      <div className="space-y-2 mb-3">
        {details.map((detail, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-500">{detail.label}</span>
            <span className="text-gray-900 font-medium">{detail.value}</span>
          </div>
        ))}
      </div>

      {actions && (
        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
