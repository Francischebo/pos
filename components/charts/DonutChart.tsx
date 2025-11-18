import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface DonutChartProps {
  data: ChartData[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#6366f1'];

const DonutChart: React.FC<DonutChartProps> = ({ data, colors = DEFAULT_COLORS }) => {
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
    const x1 = 50 + 40 * Math.cos((Math.PI / 180) * startAngle);
    const y1 = 50 + 40 * Math.sin((Math.PI / 180) * startAngle);
    const x2 = 50 + 40 * Math.cos((Math.PI / 180) * endAngle);
    const y2 = 50 + 40 * Math.sin((Math.PI / 180) * endAngle);

    return {
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length],
    };
  });

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#4a5568" strokeWidth="20" />
          {segments.map((seg, i) => (
             <path key={i} d={seg.path} fill="none" stroke={seg.color} strokeWidth="20" />
          ))}
        </svg>
      </div>
      <div className="flex flex-col space-y-2 text-sm w-full max-w-xs">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between">
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

export default DonutChart;