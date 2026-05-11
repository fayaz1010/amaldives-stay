'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Hotel,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type SummaryData = {
  period: { year: number; month: number; startDate: string; endDate: string; daysInMonth: number };
  totals: {
    totalRevenue: number;
    serviceRevenue: number;
    paidAmount: number;
    occupiedNights: number;
    totalRoomNights: number;
    totalRooms: number;
    bookingCount: number;
  };
  metrics: { occupancy: number; adr: number; revPAR: number };
  comparison: {
    totalRevenue: number;
    occupancy: number;
    adr: number;
    revPAR: number;
    revenueChange: number;
    occupancyChange: number;
    adrChange: number;
    revPARChange: number;
  };
  dailyRevenue: { day: number; date: string; revenue: number }[];
  bySource: { source: string; count: number; revenue: number }[];
  byRoomType: { type: string; nights: number; revenue: number; occupancy: number }[];
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: 'Direct',
  BOOKING_COM: 'Booking.com',
  AGODA: 'Agoda',
  AIRBNB: 'Airbnb',
  OTHER: 'Other',
};

const SOURCE_ORDER = ['DIRECT', 'BOOKING_COM', 'AGODA', 'AIRBNB', 'OTHER'];
const PIE_COLORS = ['#14B8A6', '#0EA5E9', '#8B5CF6', '#F59E0B', '#6B7280'];

function formatCurrency(n: number) {
  return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number, digits = 1) {
  return `${(n || 0).toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function ChangeChip({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
      )}
    >
      <Icon className="h-3 w-3" />
      {formatPercent(Math.abs(value))}
    </span>
  );
}

function StatCard({
  label,
  value,
  change,
  Icon,
}: {
  label: string;
  value: string;
  change?: number;
  Icon: any;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
            {typeof change === 'number' && (
              <div className="mt-2">
                <ChangeChip value={change} />
              </div>
            )}
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-teal-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportsDashboard({ initialData }: { initialData: SummaryData }) {
  const [data, setData] = useState<SummaryData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { year, month } = data.period;

  const fetchPeriod = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/summary?year=${y}&month=${m}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = (await res.json()) as SummaryData;
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrev = () => {
    const y = month === 1 ? year - 1 : year;
    const m = month === 1 ? 12 : month - 1;
    fetchPeriod(y, m);
  };
  const handleNext = () => {
    const y = month === 12 ? year + 1 : year;
    const m = month === 12 ? 1 : month + 1;
    fetchPeriod(y, m);
  };

  const pieData = useMemo(() => {
    const map = new Map(data.bySource.map((s) => [s.source, s]));
    return SOURCE_ORDER
      .map((src) => ({
        name: SOURCE_LABELS[src],
        source: src,
        value: map.get(src)?.count ?? 0,
        revenue: map.get(src)?.revenue ?? 0,
      }))
      .filter((d) => d.value > 0);
  }, [data.bySource]);

  const totalSourceCount = pieData.reduce((s, d) => s + d.value, 0);

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [['Date', 'Day', 'Revenue']];
    for (const d of data.dailyRevenue) {
      rows.push([d.date, d.day, d.revenue.toFixed(2)]);
    }
    rows.push([]);
    rows.push(['Summary', '', '']);
    rows.push(['Total Revenue', '', data.totals.totalRevenue.toFixed(2)]);
    rows.push(['Occupancy %', '', data.metrics.occupancy.toFixed(2)]);
    rows.push(['ADR', '', data.metrics.adr.toFixed(2)]);
    rows.push(['RevPAR', '', data.metrics.revPAR.toFixed(2)]);
    rows.push(['Bookings', '', data.totals.bookingCount]);
    downloadCsv(`reports-${year}-${String(month).padStart(2, '0')}.csv`, rows);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Monthly performance overview</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handlePrev}
            disabled={loading}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center font-semibold text-gray-800">
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleNext}
            disabled={loading}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-9 gap-2" onClick={handleExportCsv} disabled={loading}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Revenue"
              value={formatCurrency(data.totals.totalRevenue)}
              change={data.comparison.revenueChange}
              Icon={DollarSign}
            />
            <StatCard
              label="Occupancy"
              value={formatPercent(data.metrics.occupancy)}
              change={data.comparison.occupancyChange}
              Icon={Percent}
            />
            <StatCard
              label="ADR"
              value={formatCurrency(data.metrics.adr)}
              change={data.comparison.adrChange}
              Icon={Hotel}
            />
            <StatCard
              label="RevPAR"
              value={formatCurrency(data.metrics.revPAR)}
              change={data.comparison.revPARChange}
              Icon={BarChart3}
            />
          </div>

          {/* Daily Revenue chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dailyRevenue} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6B7280" tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(Number(v))}
                    labelFormatter={(l: any) => `Day ${l}`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="revenue" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sources + Top room types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Booking Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                    No bookings yet for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                      >
                        {pieData.map((entry) => {
                          const idx = SOURCE_ORDER.indexOf(entry.source);
                          return <Cell key={entry.source} fill={PIE_COLORS[idx >= 0 ? idx : PIE_COLORS.length - 1]} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(v: any, _name: any, item: any) => {
                          const total = totalSourceCount || 1;
                          const pct = (Number(v) / total) * 100;
                          return [`${Number(v).toLocaleString()} (${pct.toFixed(1)}%)`, item?.payload?.name];
                        }}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: any, _entry: any, idx: number) => {
                          const item = pieData[idx];
                          if (!item) return value;
                          const pct = totalSourceCount > 0 ? (item.value / totalSourceCount) * 100 : 0;
                          return (
                            <span className="text-xs text-gray-600">
                              {value} ({pct.toFixed(1)}%)
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Room Types</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byRoomType.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                    No room performance data yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-gray-500 border-b">
                          <th className="py-2 pr-2">Room Type</th>
                          <th className="py-2 pr-2 text-right">Nights</th>
                          <th className="py-2 pr-2 text-right">Revenue</th>
                          <th className="py-2 text-right">Occ %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byRoomType.map((row) => (
                          <tr key={row.type} className="border-b last:border-b-0">
                            <td className="py-2 pr-2 font-medium text-gray-800">{row.type}</td>
                            <td className="py-2 pr-2 text-right text-gray-700">
                              {row.nights.toLocaleString()}
                            </td>
                            <td className="py-2 pr-2 text-right text-gray-700">
                              {formatCurrency(row.revenue)}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {formatPercent(row.occupancy)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Bookings</p>
                  <p className="font-semibold text-gray-800">{data.totals.bookingCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Occupied Nights</p>
                  <p className="font-semibold text-gray-800">
                    {data.totals.occupiedNights.toLocaleString()} / {data.totals.totalRoomNights.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Service Revenue</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(data.totals.serviceRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Paid Amount</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(data.totals.paidAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
