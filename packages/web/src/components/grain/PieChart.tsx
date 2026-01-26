import { useState, useEffect } from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
}

export default function PieChart({ data, title }: PieChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (total === 0) {
    return (
      <div className="glass-card p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="text-center text-gray-500 py-8">No data available</div>
      </div>
    );
  }

  // Calculate percentages and cumulative angles for SVG
  let cumulativeAngle = 0;
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle: cumulativeAngle
    };
  });

  // Helper to convert polar coordinates to cartesian
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Create SVG path for each segment
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(100, 100, 90, endAngle);
    const end = polarToCartesian(100, 100, 90, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', 100, 100,
      'L', start.x, start.y,
      'A', 90, 90, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}

      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        {/* SVG Pie Chart with animated slices */}
        <svg viewBox="0 0 200 200" className="w-48 h-48">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={createArc(segment.startAngle, segment.endAngle)}
              fill={segment.color}
              className={`hover:opacity-80 transition-all duration-500 cursor-pointer origin-center ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
              style={{
                transitionDelay: `${index * 100}ms`,
                transformOrigin: '100px 100px'
              }}
            />
          ))}
        </svg>

        {/* Legend with staggered animation */}
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 transition-all duration-300 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
              style={{ transitionDelay: `${(index + segments.length) * 100}ms` }}
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: segment.color }}
              />
              <div className="text-sm">
                <span className="font-medium text-gray-700">{segment.label}</span>
                <span className="text-gray-500 ml-2">
                  {segment.value.toLocaleString()} ({segment.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
