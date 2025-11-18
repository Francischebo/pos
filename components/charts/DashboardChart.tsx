import React, { useMemo } from 'react';

interface PieChartData {
  label: string;
  value: number;
}

interface LineChartData {
    labels: [string, string][]; // [key, displayLabel]
    series: {
        name: string;
        data: number[];
    }[];
}

interface DashboardChartProps {
  title: string;
  pieData: PieChartData[];
  lineData: LineChartData;
  onHover: (key: string | null) => void;
  hoveredDataKey: string | null;
  colors?: string[];
}

const DEFAULT_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#facc15'];

const PieAndLegend: React.FC<{data: PieChartData[], colors: string[]}> = ({ data, colors }) => {
    const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    const segments = useMemo(() => {
        let cumulativePercent = 0;
        return data.map((item, index) => {
            const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            const startAngle = (cumulativePercent / 100) * 360;
            cumulativePercent += percent;
            const endAngle = (cumulativePercent / 100) * 360;

            const largeArcFlag = percent > 50 ? 1 : 0;
            const radius = 45;

            const x1 = 50 + radius * Math.cos((Math.PI / 180) * startAngle);
            const y1 = 50 + radius * Math.sin((Math.PI / 180) * startAngle);
            const x2 = 50 + radius * Math.cos((Math.PI / 180) * endAngle);
            const y2 = 50 + radius * Math.sin((Math.PI / 180) * endAngle);

            return {
                label: item.label,
                path: `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
                color: colors[index % colors.length],
            };
        });
    }, [data, totalValue, colors]);
    
    return (
        <div className="flex items-center gap-4">
            <div className="w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {segments.map((seg) => <path key={seg.label} d={seg.path} fill={seg.color} />)}
                </svg>
            </div>
            <div className="flex flex-col space-y-2 text-sm">
                {data.map((item, index) => (
                    <div key={item.label} className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: colors[index % colors.length] }}></div>
                        <span className="text-gray-400 mr-2">{item.label}</span>
                        <span className="font-semibold text-white">
                            {totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const DashboardChart: React.FC<DashboardChartProps> = ({ title, pieData, lineData, onHover, hoveredDataKey, colors = DEFAULT_COLORS }) => {
  const PADDING = { top: 10, right: 10, bottom: 20, left: 40 };
  const SVG_WIDTH = 400;
  const SVG_HEIGHT = 200;
  const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  const { points, yAxisLabels, paths } = useMemo(() => {
    if (!lineData || lineData.series.length === 0 || lineData.labels.length === 0) {
      return { points: new Map(), yAxisLabels: [], paths: [] };
    }

    const allValues = lineData.series.flatMap(s => s.data);
    const maxValue = Math.max(...allValues, 0);
    const effectiveMaxValue = maxValue > 0 ? Math.ceil(maxValue * 1.1) : 5;
    
    const yLabels = [];
    for (let i = 0; i <= 3; i++) {
        const value = (effectiveMaxValue / 3) * i;
        yLabels.push({
            value: value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 }),
            y: CHART_HEIGHT - (value / effectiveMaxValue) * CHART_HEIGHT
        });
    }

    const pointMap = new Map<string, { x: number; series: { [name: string]: { y: number; value: number } } }>();

    lineData.labels.forEach(([key], i) => {
        const x = lineData.labels.length > 1 ? (i / (lineData.labels.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2;
        const seriesData: { [name: string]: { y: number; value: number } } = {};
        lineData.series.forEach(s => {
            const value = s.data[i];
            seriesData[s.name] = {
                y: CHART_HEIGHT - (value / effectiveMaxValue) * CHART_HEIGHT,
                value
            };
        });
        pointMap.set(key, { x, series: seriesData });
    });

    const linePaths = lineData.series.map((s, seriesIndex) => {
        const path = lineData.labels.map(([key], i) => {
            const point = pointMap.get(key);
            if (!point) return '';
            return (i === 0 ? 'M' : 'L') + `${point.x} ${point.series[s.name].y}`;
        }).join(' ');
        return { name: s.name, path, color: colors[seriesIndex % colors.length] };
    });

    return { points: pointMap, yAxisLabels: yLabels, paths: linePaths };
  }, [lineData, CHART_WIDTH, CHART_HEIGHT, colors]);
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!lineData.labels || lineData.labels.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - svgRect.left - PADDING.left;
    if (x < 0 || x > CHART_WIDTH) { onHover(null); return; }

    const index = Math.round((x / CHART_WIDTH) * (lineData.labels.length - 1));
    const pointKey = lineData.labels[index]?.[0];
    if (pointKey) onHover(pointKey);
  };

  const activePoint = useMemo(() => {
    return hoveredDataKey ? points.get(hoveredDataKey) : null;
  }, [hoveredDataKey, points]);
  
  const activeLabel = useMemo(() => {
      return hoveredDataKey ? lineData.labels.find(([key]) => key === hoveredDataKey)?.[1] : null;
  }, [hoveredDataKey, lineData.labels]);

  return (
    <div className="w-full h-full flex flex-col">
        <h2 className="text-xl font-bold text-gray-300">{title}</h2>
        <div className="flex-grow flex items-center mt-2">
            <div className="flex-grow h-full relative">
                <svg
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => onHover(null)}
                    className="w-full h-full"
                >
                    <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
                        {yAxisLabels.map(label => (
                            <g key={label.value}>
                                <line x1={0} y1={label.y} x2={CHART_WIDTH} y2={label.y} stroke="#4a5568" strokeDasharray="2,2" />
                                <text x={-5} y={label.y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{label.value}</text>
                            </g>
                        ))}
                        {paths.map(p => (
                            <path key={p.name} d={p.path} fill="none" stroke={p.color} strokeWidth="2" />
                        ))}
                        {activePoint && (
                            <line x1={activePoint.x} y1={0} x2={activePoint.x} y2={CHART_HEIGHT} stroke="#6ee7b7" strokeDasharray="4,4" opacity="0.5"/>
                        )}
                        {activePoint && Object.entries(activePoint.series).map(([name, data], i) => (
                             <circle key={name} cx={activePoint.x} cy={(data as any).y} r="4" fill={colors[i % colors.length]} stroke="#1f2937" strokeWidth="2" />
                        ))}
                    </g>
                </svg>
                {activePoint && activeLabel && (
                    <div
                        className="absolute p-2 text-xs bg-gray-900 text-white rounded-md pointer-events-none transition-transform duration-100 shadow-lg"
                        style={{
                            left: `${activePoint.x + PADDING.left}px`,
                            top: `${PADDING.top}px`,
                            transform: `translate(-50%, -110%)`,
                        }}
                    >
                        <p className="font-bold mb-1">{activeLabel}</p>
                        {Object.entries(activePoint.series).map(([name, data], i) => (
                            <div key={name} className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full mr-1.5" style={{backgroundColor: colors[i % colors.length]}}></div>
                                    <span className="text-gray-400 mr-2">{name}:</span>
                                </div>
                                <span className="font-semibold">{(data as { value: number }).value.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        <div className="flex justify-between items-center mt-4">
             <PieAndLegend data={pieData} colors={colors} />
             <div className="flex justify-center items-center gap-3 text-xs flex-wrap max-w-[50%]">
                {lineData.series.map((s, i) => (
                     <div key={s.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 rounded-full" style={{backgroundColor: colors[i % colors.length]}}></div>
                        <span>{s.name}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default DashboardChart;