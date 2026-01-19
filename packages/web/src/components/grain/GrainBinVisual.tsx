import React from 'react';
import { GrainBin } from '@business-app/shared';

interface GrainBinVisualProps {
  bin: GrainBin;
  onClick?: () => void;
}

// Commodity colors and patterns
const COMMODITY_COLORS = {
  CORN: {
    fill: '#fbbf24', // Yellow
    fillDark: '#f59e0b',
    fillLight: '#fde68a',
    stroke: '#92400e',
    patternId: 'cornPattern'
  },
  SOYBEANS: {
    fill: '#86a855', // Olive/bean green
    fillDark: '#6b8839',
    fillLight: '#a3c075',
    stroke: '#4a5928',
    patternId: 'soybeanPattern'
  },
  WHEAT: {
    fill: '#f59e0b', // Amber
    fillDark: '#d97706',
    fillLight: '#fbbf24',
    stroke: '#78350f',
    patternId: 'wheatPattern'
  }
};

export const GrainBinVisual: React.FC<GrainBinVisualProps> = ({ bin, onClick }) => {
  const fillPercentage = bin.fillPercentage || Math.round((bin.currentBushels / bin.capacity) * 100);
  const colors = COMMODITY_COLORS[bin.commodityType];

  // SVG dimensions for agricultural bin shape
  const width = 140;
  const height = 220;
  const binWidth = 100;
  const roofHeight = 35; // Conical roof height
  const bodyHeight = 150; // Main cylindrical body
  const baseY = roofHeight; // Where body starts

  // Calculate fill height
  const fillHeight = (bodyHeight * fillPercentage) / 100;
  const fillY = baseY + bodyHeight - fillHeight;

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-xl bg-white border border-gray-100
        ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:scale-[1.02] hover:border-gray-200' : ''}
        transition-all duration-200 shadow-card`}
      onClick={onClick}
    >
      {/* Bin name and crop year */}
      <div className="text-center mb-3">
        <h3 className="font-semibold text-gray-900 text-base">{bin.name}</h3>
        <p className="text-sm text-gray-500">{bin.cropYear} Crop</p>
      </div>

      {/* SVG Agricultural Bin */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mb-2 drop-shadow-md"
      >
        <defs>
          {/* Corn texture pattern - small circular kernels */}
          <pattern id="cornPattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill={colors.fill} />
            <circle cx="3" cy="3" r="2.5" fill={colors.fillDark} opacity="0.8" />
            <circle cx="9" cy="3" r="2.5" fill={colors.fillLight} opacity="0.6" />
            <circle cx="6" cy="8" r="2.5" fill={colors.fillDark} opacity="0.7" />
            <circle cx="2" cy="9" r="2" fill={colors.fillLight} opacity="0.5" />
            <circle cx="10" cy="9" r="2" fill={colors.fillDark} opacity="0.6" />
          </pattern>

          {/* Soybean texture pattern - oval bean shapes */}
          <pattern id="soybeanPattern" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill={colors.fill} />
            <ellipse cx="4" cy="3" rx="2.5" ry="2" fill={colors.fillDark} opacity="0.8" />
            <ellipse cx="10" cy="4" rx="2.5" ry="2" fill={colors.fillLight} opacity="0.7" />
            <ellipse cx="7" cy="9" rx="2.5" ry="2" fill={colors.fillDark} opacity="0.75" />
            <ellipse cx="2" cy="11" rx="2" ry="1.5" fill={colors.fillLight} opacity="0.6" />
            <ellipse cx="12" cy="11" rx="2" ry="1.5" fill={colors.fillDark} opacity="0.7" />
          </pattern>

          {/* Wheat texture pattern - grain texture */}
          <pattern id="wheatPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={colors.fill} />
            <ellipse cx="2" cy="2" rx="1.5" ry="2.5" fill={colors.fillDark} opacity="0.7" />
            <ellipse cx="7" cy="3" rx="1.5" ry="2.5" fill={colors.fillLight} opacity="0.6" />
            <ellipse cx="5" cy="7" rx="1.5" ry="2.5" fill={colors.fillDark} opacity="0.75" />
          </pattern>

          {/* Gradient for 3D effect */}
          <linearGradient id="binGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
        </defs>

        {/* Conical Roof */}
        <path
          d={`M ${width / 2} 5 L ${(width - binWidth) / 2} ${roofHeight} L ${(width + binWidth) / 2} ${roofHeight} Z`}
          fill="url(#binGradient)"
          stroke={colors.stroke}
          strokeWidth="2"
        />
        {/* Roof cap/vent */}
        <circle cx={width / 2} cy="8" r="4" fill="#6b7280" stroke={colors.stroke} strokeWidth="1" />

        {/* Bin body - background (empty space) */}
        <rect
          x={(width - binWidth) / 2}
          y={baseY}
          width={binWidth}
          height={bodyHeight}
          fill="#e5e7eb"
          stroke={colors.stroke}
          strokeWidth="2.5"
        />

        {/* Vertical ribs/corrugation lines on bin */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
          <line
            key={i}
            x1={(width - binWidth) / 2 + binWidth * ratio}
            y1={baseY}
            x2={(width - binWidth) / 2 + binWidth * ratio}
            y2={baseY + bodyHeight}
            stroke="#9ca3af"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}

        {/* Fill level with grain texture */}
        {fillPercentage > 0 && (
          <>
            <rect
              x={(width - binWidth) / 2}
              y={fillY}
              width={binWidth}
              height={fillHeight}
              fill={`url(#${colors.patternId})`}
              stroke="none"
            />

            {/* Top surface of grain (darker shade) */}
            <ellipse
              cx={width / 2}
              cy={fillY}
              rx={binWidth / 2}
              ry="8"
              fill={colors.fillDark}
              opacity="0.9"
            />

            {/* Highlight on grain surface */}
            <ellipse
              cx={width / 2}
              cy={fillY}
              rx={binWidth / 3}
              ry="5"
              fill={colors.fillLight}
              opacity="0.4"
            />
          </>
        )}

        {/* Access ladder */}
        <rect
          x={(width + binWidth) / 2 - 6}
          y={baseY + 10}
          width="6"
          height={bodyHeight - 10}
          fill="#6b7280"
          stroke="#374151"
          strokeWidth="1"
        />
        {/* Ladder rungs */}
        {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
          <rect
            key={i}
            x={(width + binWidth) / 2 - 10}
            y={baseY + 10 + (bodyHeight - 10) * ratio}
            width="10"
            height="2"
            fill="#374151"
          />
        ))}

        {/* Base/foundation */}
        <rect
          x={(width - binWidth) / 2 - 5}
          y={baseY + bodyHeight}
          width={binWidth + 10}
          height="8"
          fill="#4b5563"
          stroke="#1f2937"
          strokeWidth="1.5"
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

        {/* Contract allocation info */}
        {bin.contractedBushels > 0 && (
          <div className="mt-2 text-xs">
            <div className="flex items-center justify-center gap-1">
              <span className="text-blue-600 font-semibold">{bin.contractedBushels.toLocaleString()} bu</span>
              <span className="text-gray-500">contracted</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-green-600 font-semibold">
                {(bin.currentBushels - bin.contractedBushels).toLocaleString()} bu
              </span>
              <span className="text-gray-500">available</span>
            </div>
          </div>
        )}
      </div>

      {/* Status badges */}
      <div className="flex flex-col items-center gap-1 mt-2">
        {/* Marketplace availability badge */}
        {bin.isAvailableForSale && (
          <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            For Sale
          </div>
        )}

        {/* Warning if nearly full */}
        {fillPercentage >= 90 && (
          <div className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
            Nearly Full
          </div>
        )}
      </div>
    </div>
  );
};
