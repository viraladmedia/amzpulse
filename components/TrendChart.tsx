import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PricePoint, RankPoint } from '../types';

interface TrendChartProps {
  priceData: PricePoint[];
  bsrData: RankPoint[];
}

const TrendChart: React.FC<TrendChartProps> = ({ priceData, bsrData }) => {
  // Merge data based on date for the composed chart
  const mergedData = priceData.map((p, index) => ({
    date: p.date,
    price: p.price,
    rank: bsrData[index]?.rank || 0
  }));

  return (
    <div className="w-full h-72 bg-slate-900 rounded-lg p-4 border border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Price vs. Sales Rank</h3>
        <div className="flex gap-4 text-[10px]">
            <span className="flex items-center gap-1 text-amz-accent"><div className="w-2 h-2 rounded-full bg-amz-accent"></div> Buy Box ($)</span>
            <span className="flex items-center gap-1 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400"></div> Sales Rank</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={mergedData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff9900" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ff9900" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            tick={{ dy: 10 }}
          />
          {/* Left Axis: Price */}
          <YAxis 
            yAxisId="left"
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
            domain={['auto', 'auto']}
          />
          {/* Right Axis: Rank (Inverted) */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#4ade80" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            reversed={true}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `#${value/1000}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
          />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="price" 
            name="Buy Box Price"
            stroke="#ff9900" 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            strokeWidth={2}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="rank" 
            name="Sales Rank"
            stroke="#4ade80" 
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;