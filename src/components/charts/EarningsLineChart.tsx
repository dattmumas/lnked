'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface Datum {
  month: string;
  gross: number;
  net: number;
  fee: number;
  followers: number;
  subscribers: number;
}

export default function EarningsLineChart({
  data,
  currency,
}: {
  data: Datum[];
  currency: string;
}): React.ReactElement {
  const formatted = data.map((d) => ({
    name: d.month,
    Gross: d.gross / 100,
    Net: d.net / 100,
    Fees: d.fee / 100,
    Followers: d.followers,
    Subscribers: d.subscribers,
  }));

  const metricOptions = [
    'Gross',
    'Net',
    'Fees',
    'Followers',
    'Subscribers',
  ] as const;
  type Metric = (typeof metricOptions)[number];
  const [activeMetric, setActiveMetric] = useState<Metric>('Gross');

  return (
    <ResponsiveContainer width="100%" height={300}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {metricOptions.map((m) => (
            <button
              type="button"
              key={m}
              className={
                `px-3 py-1 rounded-md text-sm ${ 
                activeMetric === m
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground'}`
              }
              onClick={() => setActiveMetric(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={formatted}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip
              formatter={(value: number) =>
                activeMetric === 'Gross' ||
                activeMetric === 'Net' ||
                activeMetric === 'Fees'
                  ? `${currency} ${value.toFixed(2)}`
                  : value.toString()
              }
            />
            <Line
              type="monotone"
              dataKey={activeMetric}
              stroke="#60a5fa"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ResponsiveContainer>
  );
}
