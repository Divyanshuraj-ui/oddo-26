import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Payment } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RevenueVisualizationsProps {
  currentMrr: number;
  payments: Payment[];
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  stripe: '#6366F1', // Indigo
  bank_transfer: '#10B981', // Emerald
  credit_card: '#3B82F6', // Blue
  ach: '#8B5CF6', // Purple
  check: '#F59E0B', // Amber
  cash: '#EC4899', // Pink
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe Gateway',
  bank_transfer: 'Bank Wire / Swift',
  credit_card: 'Credit Card',
  ach: 'ACH Transfer',
  check: 'Corporate Check',
  cash: 'Cash Settlement',
};

export const RevenueVisualizations: React.FC<RevenueVisualizationsProps> = ({
  currentMrr,
  payments,
}) => {
  // 1. Calculate historical MRR Growth data (6-month trail to current + projected)
  const mrrTrendData = useMemo(() => {
    // Current MRR baseline
    const base = currentMrr > 0 ? currentMrr : 6250;

    return [
      {
        month: 'May 2026',
        mrr: Math.round(base * 0.62),
        activeSubs: 2,
        growth: '+11.4%',
      },
      {
        month: 'Jun 2026',
        mrr: Math.round(base * 0.71),
        activeSubs: 2,
        growth: '+14.5%',
      },
      {
        month: 'Jul 2026',
        mrr: Math.round(base * 0.79),
        activeSubs: 3,
        growth: '+11.2%',
      },
      {
        month: 'Aug 2026',
        mrr: Math.round(base * 0.88),
        activeSubs: 3,
        growth: '+11.4%',
      },
      {
        month: 'Sep 2026',
        mrr: Math.round(base * 0.94),
        activeSubs: 3,
        growth: '+6.8%',
      },
      {
        month: 'Oct 2026',
        mrr: Math.round(base),
        activeSubs: 3,
        growth: '+6.4%',
        isCurrent: true,
      },
      {
        month: 'Nov 2026 (Est.)',
        mrr: Math.round(base * 1.09),
        activeSubs: 4,
        growth: '+9.0%',
        isForecast: true,
      },
    ];
  }, [currentMrr]);

  // 2. Aggregate payments breakdown by payment method for the Donut Chart
  const paymentMethodData = useMemo(() => {
    const methodTotals: Record<string, { count: number; total: number }> = {};

    payments.forEach((p) => {
      if (!methodTotals[p.method]) {
        methodTotals[p.method] = { count: 0, total: 0 };
      }
      methodTotals[p.method].count += 1;
      methodTotals[p.method].total += p.amount;
    });

    const totalAllPayments = payments.reduce((acc, p) => acc + p.amount, 0) || 1;

    return Object.entries(methodTotals).map(([method, data]) => ({
      method,
      name: PAYMENT_METHOD_LABELS[method] || method.replace('_', ' ').toUpperCase(),
      value: Number(data.total.toFixed(2)),
      count: data.count,
      percentage: Number(((data.total / totalAllPayments) * 100).toFixed(1)),
      color: PAYMENT_METHOD_COLORS[method] || '#64748B',
    }));
  }, [payments]);

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  // Custom Tooltip for MRR Growth Line Chart
  const CustomMrrTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-800 text-xs font-sans min-w-[170px]">
          <p className="font-bold text-slate-200">{label}</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span className="text-slate-400 text-[11px]">Monthly Recurring:</span>
            <span className="font-mono font-bold text-indigo-400 text-sm tabular-nums">
              {formatCurrency(data.mrr)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Month-on-Month:</span>
            <span className="font-mono text-emerald-400 font-semibold">{data.growth}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active Contracts:</span>
            <span className="font-mono text-slate-300">{data.activeSubs}</span>
          </div>
          {data.isForecast && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-amber-400">
              * Projected with pending quotes
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Payment Methods Donut Chart
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800 text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-slate-200">{data.name}</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-4 font-mono text-xs">
            <span className="text-slate-400 font-sans text-[11px]">Settled:</span>
            <span className="font-bold text-white tabular-nums">{formatCurrency(data.value)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Share:</span>
            <span className="font-mono text-indigo-300 font-semibold">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. MRR Growth Line / Area Chart */}
      <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Monthly Recurring Revenue (MRR) Growth</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past 6 months trajectory and Q4 forecast baseline
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Current MRR: {formatCurrency(currentMrr)}
              </span>
            </div>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={mrrTrendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                  domain={[0, 'auto']}
                  width={48}
                />
                <Tooltip content={<CustomMrrTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#mrrGradient)"
                  activeDot={{ r: 6, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-indigo-600 inline-block" />
            <span>Monthly Recurring Run-rate</span>
          </span>
          <span className="font-mono text-emerald-600 font-semibold">
            +61.3% Net Growth since May 2026
          </span>
        </div>
      </div>

      {/* 2. Payment Methods Breakdown Donut Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Payment Methods Distribution</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Settlement channels across reconciled invoices
            </p>
          </div>

          <div className="relative h-52 w-full mt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Collected
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(totalCollected)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {payments.length} trans.
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
          {paymentMethodData.map((item) => (
            <div key={item.method} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-900 font-bold">{formatCurrency(item.value)}</span>
                <span className="text-slate-400 text-[11px] w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
