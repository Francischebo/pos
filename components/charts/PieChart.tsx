import React, { useState } from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface PieChartProps {
  data: ChartData[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#6366f1'];

const PieChart: React.FC<PieChartProps> = ({ data, colors = DEFAULT_COLORS }) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for this period.</div>;
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  let cumulativePercent = 0;
  const segments = data.map((item, index) => {
    const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    const startAngle = (cumulativePercent / 100) * 360;
    const endAngle = ((cumulativePercent + percent) / 100) * 360;
    cumulativePercent += percent;

    const largeArcFlag = percent > 50 ? 1 : 0;
    const isHovered = hoveredSegment === item.label;
    const radius = isHovered ? 48 : 45;

    const x1 = 50 + radius * Math.cos((Math.PI / 180) * startAngle);
    const y1 = 50 + radius * Math.sin((Math.PI / 180) * startAngle);
    const x2 = 50 + radius * Math.cos((Math.PI / 180) * endAngle);
    const y2 = 50 + radius * Math.sin((Math.PI / 180) * endAngle);

    return {
      label: item.label,
      percent: percent,
      path: `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length],
    };
  });

  const hoveredData = data.find(d => d.label === hoveredSegment);
  const hoveredPercent = hoveredData && totalValue > 0 ? (hoveredData.value / totalValue) * 100 : null;

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {segments.map((seg) => (
             <path 
                key={seg.label} 
                d={seg.path} 
                fill={seg.color}
                onMouseEnter={() => setHoveredSegment(seg.label)}
                onMouseLeave={() => setHoveredSegment(null)}
                className="transition-all duration-200"
             />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {hoveredSegment && hoveredPercent !== null && (
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{hoveredPercent.toFixed(1)}%</p>
              <p className="text-sm text-gray-300 truncate max-w-[100px]">{hoveredSegment}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col space-y-2 text-sm w-full max-w-xs">
        {data.map((item, index) => (
          <div 
            key={item.label} 
            className="flex items-center justify-between p-1 rounded-md cursor-pointer"
            onMouseEnter={() => setHoveredSegment(item.label)}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="flex items-center">
                <span
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: colors[index % colors.length] }}
                ></span>
                <span className="text-gray-300 truncate">{item.label}</span>
            </div>
            <span className="font-semibold text-white ml-auto pl-4">
              {totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;