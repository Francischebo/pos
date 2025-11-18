import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  yAxisLabel?: string;
  horizontal?: boolean;
  colors?: string[];
  peakValueLabel?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, yAxisLabel, horizontal = false, colors = ['#3b82f6'], peakValueLabel }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for this period.</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const scale = maxValue === 0 ? 0 : 100 / maxValue;

  if (horizontal) {
    return (
      <div className="w-full h-full flex flex-col space-y-2 pr-4">
        {data.map(({ label, value }, index) => {
           const barColor = colors[index % colors.length];
           return (
            <div key={label} className="flex items-center group">
              <div className="w-1/3 text-sm text-gray-300 truncate pr-2 text-right">{label}</div>
              <div className="w-2/3 flex items-center">
                <div
                  className="rounded-r-sm transition-all duration-200 group-hover:brightness-110"
                  style={{ width: `${value * scale}%`, height: '24px', backgroundColor: barColor }}
                ></div>
                <span className="text-sm font-semibold text-white ml-2">{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical Bar Chart
  return (
    <div className="w-full h-full flex items-end justify-around gap-2 px-4 relative">
        {yAxisLabel && <div className="absolute top-0 left-0 text-xs text-gray-500 transform -translate-x-full -translate-y-1/2 rotate-[-90deg] origin-bottom-left">{yAxisLabel}</div>}
      {data.map(({ label, value }, index) => {
        const isPeak = label === peakValueLabel;
        const barColor = colors[index % colors.length];
        
        return (
            <div key={label} className="flex-1 flex flex-col items-center justify-end group relative">
            <div className="absolute bottom-full mb-2 w-max p-2 text-xs bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <strong>{label}:</strong> Avg {value.toLocaleString(undefined, { maximumFractionDigits: 2 })} txns
            </div>
            <div
                className="w-full rounded-t-sm transition-all duration-200 group-hover:opacity-80"
                style={{ height: `${value * scale}%`, backgroundColor: barColor }}
            ></div>
            <div className={`text-xs mt-1 truncate ${isPeak ? 'font-bold text-emerald-300' : 'text-gray-400'}`}>{label}</div>
            </div>
        )
      })}
    </div>
  );
};

export default BarChart;