import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
  Legend,
} from 'recharts';
import { type ReadingType } from '../db/database';

export interface ChartDataPoint {
  date: string;
  displayDate: string;
  value: number;
  source: 'Clinic Visit' | 'Between-Visit Reading';
  enteredBy: string;
  notes?: string;
}

interface TrendChartProps {
  parameter: ReadingType;
  title: string;
  unit: string;
  targetMin: number;
  targetMax: number;
  guidelineSource: string;
  data: ChartDataPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({
  parameter,
  title,
  unit,
  targetMin,
  targetMax,
  guidelineSource,
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
        <h4 className="text-xs font-bold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500 mt-2">No historical readings recorded for this parameter.</p>
      </div>
    );
  }

  // Calculate Y min and max with margin
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, targetMin);
  const maxVal = Math.max(...values, targetMax);
  const yDomainMin = Math.max(0, Math.floor(minVal * 0.85));
  const yDomainMax = Math.ceil(maxVal * 1.15);

  const strokeColor = parameter === 'systolic' ? '#0d9488' : parameter === 'diastolic' ? '#0284c7' : parameter === 'bloodSugar' ? '#f59e0b' : '#64748b';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
          <p className="text-[11px] text-slate-500">
            Guideline Target: <span className="font-semibold text-teal-800">{targetMin} – {targetMax} {unit}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600 truncate max-w-[220px]" title={guidelineSource}>
            {guidelineSource}
          </span>
        </div>
      </div>

      {/* Legend / Tag Indicator */}
      <div className="flex items-center gap-4 text-[11px] text-slate-600 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
          <span>Clinic Visit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 inline-block" />
          <span>Between-Visit (ASHA)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2 bg-emerald-100 border border-emerald-300 inline-block rounded-xs" />
          <span>Target Range</span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-52 sm:h-60 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            
            {/* Shaded Target Range Area */}
            <ReferenceArea
              y1={targetMin}
              y2={targetMax}
              fill="#10b981"
              fillOpacity={0.12}
              stroke="#059669"
              strokeDasharray="2 2"
              strokeOpacity={0.3}
            />

            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ChartDataPoint;
                  const isOutOfRange = pt.value < targetMin || pt.value > targetMax;
                  return (
                    <div className="rounded-xl bg-slate-900 text-white p-2.5 text-xs shadow-xl border border-slate-700 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-teal-300">{pt.date}</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {pt.source}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-white">
                        {pt.value} {unit}
                        {isOutOfRange && (
                          <span className="ml-1.5 text-[10px] text-rose-400 font-bold uppercase">
                            (Outside Target)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-300">By: {pt.enteredBy}</p>
                      {pt.notes && <p className="text-[10px] text-slate-400 italic">"{pt.notes}"</p>}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2.5}
              activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.source === 'Clinic Visit') {
                  return (
                    <circle
                      key={`circle-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill={strokeColor}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                }
                // Diamond for between-visit reading
                const size = 5;
                const path = `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
                return (
                  <path
                    key={`diamond-${cx}-${cy}`}
                    d={path}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
