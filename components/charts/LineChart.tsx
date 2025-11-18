import React, { useState, useMemo } from 'react';

interface ChartDataItem {
  label: string;
  value: number;
  key: string;
}

interface LineChartProps {
  data: ChartDataItem[];
  yAxisLabel?: string;
  onHover: (key: string | null) => void;
  hoveredDataKey: string | null;
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, yAxisLabel, onHover, hoveredDataKey, color = '#10b981' }) => {
  const [localTooltip, setLocalTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };
  const SVG_WIDTH = 600;
  const SVG_HEIGHT = 300;
  const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  const { points, yAxisLabels, effectiveMaxValue } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], yAxisLabels: [], effectiveMaxValue: 0 };

    const maxValue = Math.max(...data.map(d => d.value), 0);
    const effectiveMaxValue = maxValue > 0 ? Math.ceil(maxValue * 1.1) : (data.length > 0 ? 5 : 0);
    
    const labels = [];
    for (let i = 0; i <= 5; i++) {
        const value = (effectiveMaxValue / 5) * i;
        labels.push({
            value: value.toLocaleString('en-US', { notation: 'compact' }),
            y: CHART_HEIGHT - (value / effectiveMaxValue) * CHART_HEIGHT
        });
    }

    const chartPoints = data.map((d, i) => ({
      x: data.length > 1 ? (i / (data.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2,
      y: CHART_HEIGHT - (d.value / effectiveMaxValue) * CHART_HEIGHT,
      label: d.label,
      key: d.key,
      value: d.value
    }));

    return { points: chartPoints, yAxisLabels: labels, effectiveMaxValue };
  }, [data, CHART_WIDTH, CHART_HEIGHT]);

  const path = useMemo(() => {
      if (!points || points.length < 2) return '';
      return points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');
  }, [points]);
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points || points.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - svgRect.left - PADDING.left;
    if (x < 0 || x > CHART_WIDTH) { onHover(null); return; }

    const index = Math.round((x / CHART_WIDTH) * (data.length - 1));
    const point = points[index];
    if (point) onHover(point.key);
  };
  
  const activePoint = useMemo(() => {
    return hoveredDataKey ? points.find(p => p.key === hoveredDataKey) : null;
  }, [hoveredDataKey, points]);


  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for this period.</div>;
  }

  return (
    <div className="w-full h-full relative">
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
              <text x={-10} y={label.y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">
                {label.value}
              </text>
            </g>
          ))}
          {yAxisLabel && (
              <text transform={`rotate(-90)`} y={0 - PADDING.left + 10} x={0 - (CHART_HEIGHT / 2)} textAnchor="middle" fill="#9ca3af" fontSize="10">
                  {yAxisLabel}
              </text>
          )}

          {points.map((p, i) => {
             const showLabel = points.length < 20 || i % Math.floor(points.length / 15) === 0;
             return showLabel && (
                <text key={p.label} x={p.x} y={CHART_HEIGHT + 20} textAnchor="middle" fill="#9ca3af" fontSize="10">
                  {p.label}
                </text>
             )
          })}
          
          <path d={path} fill="none" stroke={color} strokeWidth="2" />
          <path d={`${path} L ${points[points.length-1]?.x || 0} ${CHART_HEIGHT} L ${points[0]?.x || 0} ${CHART_HEIGHT} Z`} fill="url(#area-gradient-line)" />
          
          {activePoint && (
            <g>
              <line x1={activePoint.x} y1={0} x2={activePoint.x} y2={CHART_HEIGHT} stroke={color} strokeDasharray="4,4" opacity="0.5" />
              <circle cx={activePoint.x} cy={activePoint.y} r="5" fill={color} stroke="#1f2937" strokeWidth="2" />
            </g>
          )}
        </g>
        
        <defs>
          <linearGradient id="area-gradient-line" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
      {activePoint && (
        <div
          className="absolute p-2 text-xs bg-gray-900 text-white rounded-md pointer-events-none transition-transform duration-100"
          style={{
            left: `${activePoint.x + PADDING.left}px`,
            top: `${activePoint.y + PADDING.top - 10}px`,
            transform: `translate(-50%, -100%)`,
          }}
        >
          <p className="font-bold">{activePoint.label}</p>
          <p>{yAxisLabel}: {activePoint.value.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default LineChart;