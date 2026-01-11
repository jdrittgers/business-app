import React from 'react';
import { GrainBin } from '@business-app/shared';

interface GrainBinVisualProps {
  bin: GrainBin;
  onClick?: () => void;
}

// Commodity colors
const COMMODITY_COLORS = {
  CORN: {
    fill: '#fbbf24', // Yellow
    fillDark: '#f59e0b',
    stroke: '#92400e'
  },
  SOYBEANS: {
    fill: '#10b981', // Green
    fillDark: '#059669',
    stroke: '#064e3b'
  },
  WHEAT: {
    fill: '#f59e0b', // Amber
    fillDark: '#d97706',
    stroke: '#78350f'
  }
};

export const GrainBinVisual: React.FC<GrainBinVisualProps> = ({ bin, onClick }) => {
  const fillPercentage = bin.fillPercentage || Math.round((bin.currentBushels / bin.capacity) * 100);
  const colors = COMMODITY_COLORS[bin.commodityType];

  // SVG dimensions
  const width = 120;
  const height = 200;
  const cylinderWidth = 80;
  const ellipseRy = 12; // Height of ellipse
  const bodyHeight = height - ellipseRy * 3; // Space for top and bottom ellipses

  // Calculate fill height
  const fillHeight = (bodyHeight * fillPercentage) / 100;
  const fillY = height - ellipseRy - fillHeight;

  return (
    <div
      className={`flex flex-col items-center ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      {/* Bin name and crop year */}
      <div className="text-center mb-2">
        <h3 className="font-semibold text-gray-900">{bin.name}</h3>
        <p className="text-sm text-gray-500">{bin.cropYear} Crop</p>
      </div>

      {/* SVG Cylinder */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mb-2"
      >
        {/* Outer cylinder body (background) */}
        <rect
          x={(width - cylinderWidth) / 2}
          y={ellipseRy}
          width={cylinderWidth}
          height={bodyHeight}
          fill="#f3f4f6"
          stroke={colors.stroke}
          strokeWidth="2"
        />

        {/* Bottom ellipse (always visible) */}
        <ellipse
          cx={width / 2}
          cy={height - ellipseRy}
          rx={cylinderWidth / 2}
          ry={ellipseRy}
          fill="#e5e7eb"
          stroke={colors.stroke}
          strokeWidth="2"
        />

        {/* Fill level body (if there's grain) */}
        {fillPercentage > 0 && (
          <>
            <rect
              x={(width - cylinderWidth) / 2}
              y={fillY}
              width={cylinderWidth}
              height={fillHeight}
              fill={colors.fill}
            />

            {/* Fill level top ellipse */}
            <ellipse
              cx={width / 2}
              cy={fillY}
              rx={cylinderWidth / 2}
              ry={ellipseRy}
              fill={colors.fillDark}
              stroke={colors.stroke}
              strokeWidth="1"
            />
          </>
        )}

        {/* Top ellipse (bin lid) */}
        <ellipse
          cx={width / 2}
          cy={ellipseRy}
          rx={cylinderWidth / 2}
          ry={ellipseRy}
          fill="#d1d5db"
          stroke={colors.stroke}
          strokeWidth="2"
        />
      </svg>

      {/* Fill percentage and bushels */}
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{fillPercentage}%</div>
        <div className="text-sm text-gray-600">
          {bin.currentBushels.toLocaleString()} / {bin.capacity.toLocaleString()} bu
        </div>
        <div className="text-xs text-gray-500 mt-1 capitalize">
          {bin.commodityType.toLowerCase()}
        </div>
      </div>

      {/* Warning if nearly full */}
      {fillPercentage >= 90 && (
        <div className="mt-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
          Nearly Full
        </div>
      )}
    </div>
  );
};
