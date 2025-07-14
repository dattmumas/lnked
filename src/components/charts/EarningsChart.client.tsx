'use client';

import EarningsLineChart from './EarningsLineChart';

interface Datum {
  month: string;
  gross: number;
  net: number;
  fee: number;
  followers: number;
  subscribers: number;
}

export default function EarningsChartClient({
  data,
  currency,
}: {
  data: Datum[];
  currency: string;
}): React.ReactElement {
  return <EarningsLineChart data={data} currency={currency} />;
}
