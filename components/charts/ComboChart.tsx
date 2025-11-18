import React from 'react';

interface ComboChartData {
    [key: string]: {
        revenue: number;
        profit: number;
    };
}

interface ComboChartProps {
  data: [string, { revenue: number; profit: number }][];
  groupBy: 'hour' | 'day' | 'week' | 'month';
}

const ComboChart: React.FC<ComboChartProps> = ({ data, groupBy }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for this period.</div>;
  }

  const maxRevenue = Math.max(...data.map(([, values]) => values.revenue), 1); // Avoid division by zero
  const revenueScale = 100 / maxRevenue;

  const getLabel = (key: string, type: 'axis' | 'tooltip') => {
    const date = new Date(key);
    switch (groupBy) {
        case 'hour':
            return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
        case 'day':
            return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric'});
        case 'week':
            const weekStart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
            return type === 'axis' ? `Wk of ${weekStart}` : weekStart;
        case 'month':
            return date.toLocaleDateString('en-US', { month: 'long' });
        default:
            return date.toLocaleDateString();
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
        <div className="flex-grow flex items-end justify-around gap-1 px-4 relative">
            <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-gray-500 -translate-x-full pr-2 py-1">
                <span>{maxRevenue.toLocaleString(undefined, { notation: 'compact' })}</span>
                <span>0</span>
            </div>

            {data.map(([key, values], index) => (
                <div key={key} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                    <div
                        className="w-full rounded-t-sm bg-blue-500/70 transition-colors duration-200 group-hover:bg-blue-500"
                        style={{ height: `${values.revenue * revenueScale}%` }}
                    />
                    {index < data.length - 1 && (
                        <svg className="absolute top-0 left-1/2 w-full h-full overflow-visible">
                            <line
                                x1="0"
                                y1={`${100 - (values.profit * revenueScale)}%`}
                                x2="100%"
                                y2={`${100 - (data[index+1][1].profit * revenueScale)}%`}
                                stroke="#f97316"
                                strokeWidth="2"
                            />
                        </svg>
                    )}
                    <div 
                        className="absolute w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-gray-800 group-hover:scale-125 transition-transform"
                        style={{ bottom: `calc(${values.profit * revenueScale}% - 5px)` }}
                    />
                    <div className="absolute bottom-full mb-2 w-max p-2 text-xs bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <p className="font-bold">{getLabel(key, 'tooltip')}</p>
                        <p><span className="text-blue-400">Revenue:</span> KES {values.revenue.toLocaleString()}</p>
                        <p><span className="text-orange-400">Profit:</span> KES {values.profit.toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
         <div className="flex items-end justify-around gap-1 px-4 h-6 mt-1">
              {data.map(([key]) => (
                 <div key={key} className="flex-1 text-center text-xs text-gray-400 truncate">{getLabel(key, 'axis')}</div>
              ))}
        </div>
        <div className="flex justify-center items-center gap-6 text-sm mt-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                <span>Revenue</span>
            </div>
             <div className="flex items-center gap-2">
                 <div className="w-3 h-0.5 rounded-full bg-orange-500"></div>
                <span>Gross Profit</span>
            </div>
        </div>
    </div>
  );
};

export default ComboChart;