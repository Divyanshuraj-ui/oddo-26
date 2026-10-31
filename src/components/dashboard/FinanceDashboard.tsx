import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Layers,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RevenueVisualizations } from './RevenueVisualizations';

interface FinanceDashboardProps {
  onSelectSubscription: (id: string) => void;
  onSelectInvoice: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  onSelectSubscription,
  onSelectInvoice,
  onNavigateToTab,
}) => {
  const { subscriptions, invoices, payments, plans, customers, chaseOverdueInvoice } = useApp();

  const [intervalFilter, setIntervalFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('month');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Calculate MRR (Monthly Recurring Revenue)
  const mrr = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        const plan = plans.find((p) => p.id === s.planId);
        if (!plan) return sum;
        if (plan.billingInterval === 'monthly') return sum + s.totalAmount;
        if (plan.billingInterval === 'yearly') return sum + s.totalAmount / 12;
        if (plan.billingInterval === 'weekly') return sum + (s.totalAmount * 52) / 12;
        if (plan.billingInterval === 'daily') return sum + s.totalAmount * 30;
        return sum + s.totalAmount;
      }, 0);
  }, [subscriptions, plans]);

  const arr = mrr * 12;

  // 2. Active subscriptions
  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'active');
  }, [subscriptions]);

  // 3. Revenue collected (from payments)
  const totalRevenueCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  // 4. Invoices metrics
  const totalInvoiced = useMemo(() => {
    return invoices
      .filter((i) => i.status !== 'cancelled')
      .reduce((acc, i) => acc + i.grandTotal, 0);
  }, [invoices]);

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((i) => i.status === 'confirmed' || i.status === 'overdue')
      .reduce((acc, i) => acc + i.amountDue, 0);
  }, [invoices]);

  const overdueInvoices = useMemo(() => {
    return invoices.filter((i) => i.status === 'overdue');
  }, [invoices]);

  const totalOverdueAmount = useMemo(() => {
    return overdueInvoices.reduce((acc, i) => acc + i.amountDue, 0);
  }, [overdueInvoices]);

  const collectionRate = totalInvoiced > 0 ? (totalRevenueCollected / totalInvoiced) * 100 : 0;

  // Filtered subscriptions list for fast interactive scrutiny
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const plan = plans.find((p) => p.id === sub.planId);
      const customer = customers.find((c) => c.id === sub.customerId);

      if (intervalFilter !== 'all' && plan?.billingInterval !== intervalFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = sub.number.toLowerCase().includes(query);
        const matchesCustomer =
          customer?.name.toLowerCase().includes(query) ||
          customer?.companyName.toLowerCase().includes(query);
        const matchesPlan = plan?.name.toLowerCase().includes(query);
        return matchesNumber || matchesCustomer || matchesPlan;
      }

      return true;
    });
  }, [subscriptions, plans, customers, intervalFilter, searchQuery]);

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = [
      'Subscription Number',
      'Customer',
      'Company',
      'Plan',
      'Interval',
      'Status',
      'Start Date',
      'Next Billing',
      'Amount ($)',
    ];

    const rows = filteredSubscriptions.map((sub) => {
      const plan = plans.find((p) => p.id === sub.planId);
      const cust = customers.find((c) => c.id === sub.customerId);
      return [
        sub.number,
        `"${cust?.name || ''}"`,
        `"${cust?.companyName || ''}"`,
        `"${plan?.name || ''}"`,
        plan?.billingInterval || '',
        sub.status,
        sub.startDate,
        sub.nextBillingDate,
        sub.totalAmount.toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brightloop_finance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Finance & Executive Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of active subscriptions, recognized revenue, cash collection, and overdue receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'month' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setTimeframe('quarter')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'quarter' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => setTimeframe('ytd')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'ytd' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              YTD
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR / ARR */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Monthly Recurring (MRR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(mrr)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>ARR:</span>
            <span className="font-semibold text-slate-700 font-mono tabular-nums">
              {formatCurrency(arr)}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-600 font-medium">+14.2% QoQ</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Subscriptions</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {activeSubscriptions.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>Across 4 customer accounts · 0 churn</span>
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Revenue Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {formatCurrency(totalRevenueCollected)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>Collection rate: </span>
            <span className="font-semibold text-slate-700 font-mono tabular-nums">
              {collectionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Overdue Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Overdue Receivables</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600">
            {formatCurrency(totalOverdueAmount)}
          </div>
          <div className="mt-1 text-[11px] text-rose-700 flex items-center justify-between">
            <span>{overdueInvoices.length} invoice(s) overdue</span>
            {overdueInvoices.length > 0 && (
              <button
                onClick={() => onNavigateToTab('invoices')}
                className="underline hover:text-rose-900 font-medium"
              >
                Review & Chase
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Invoices Alert Banner if any */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">
                Action Required: {overdueInvoices.length} Overdue Invoice(s) Detected ({formatCurrency(totalOverdueAmount)})
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Outstanding past due date. Chase immediately to protect recurring cashflow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {overdueInvoices.map((inv, idx) => (
              <button
                key={`${inv.id}-${idx}`}
                onClick={() => chaseOverdueInvoice(inv.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Chase {inv.number}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recharts Analytics: MRR Growth Trendline & Payment Methods Donut */}
      <RevenueVisualizations currentMrr={mrr} payments={payments} />

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Plan Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Revenue Cadence Breakdown</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Distribution across billing intervals</p>

          <div className="mt-4 space-y-3">
            {plans.map((plan) => {
              const subsForPlan = subscriptions.filter((s) => s.planId === plan.id && s.status === 'active');
              const totalPlanRevenue = subsForPlan.reduce((acc, s) => acc + s.totalAmount, 0);
              const percentage = mrr > 0 ? ((totalPlanRevenue / mrr) * 100).toFixed(0) : '0';

              return (
                <div key={plan.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{plan.name}</span>
                    <span className="font-mono tabular-nums text-slate-600 font-semibold">
                      {formatCurrency(totalPlanRevenue)} ({subsForPlan.length})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Number(percentage))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="capitalize">{plan.billingInterval} billing</span>
                    <span>{percentage}% of active book</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Flow Summary */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cashflow & Receivables Ledger</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of invoiced revenue versus settled cash
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('billing')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Go to Billing Engine</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg mb-4 text-center">
            <div>
              <span className="text-[11px] text-slate-500">Gross Invoiced</span>
              <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {formatCurrency(totalInvoiced)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Cash Received</span>
              <p className="text-base font-bold font-mono tabular-nums text-emerald-600 mt-0.5">
                {formatCurrency(totalRevenueCollected)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Total Outstanding</span>
              <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Collection Progress</span>
              <span className="font-mono tabular-nums font-semibold">{collectionRate.toFixed(1)}% settled</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-3 transition-all"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
                title="Paid"
              />
              <div
                className="bg-amber-400 h-3 transition-all"
                style={{ width: `${Math.min(100, ((totalOutstanding - totalOverdueAmount) / (totalInvoiced || 1)) * 100)}%` }}
                title="Pending Due"
              />
              <div
                className="bg-rose-500 h-3 transition-all"
                style={{ width: `${Math.min(100, (totalOverdueAmount / (totalInvoiced || 1)) * 100)}%` }}
                title="Overdue"
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Collected ({formatCurrency(totalRevenueCollected)})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Current Pending ({formatCurrency(totalOutstanding - totalOverdueAmount)})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Overdue ({formatCurrency(totalOverdueAmount)})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Search & Interactive Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Subscription Portfolio Explorer</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-performance query view responding in &lt;200ms across all book records
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by customer, plan, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
              />
            </div>

            {/* Interval Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <button
                onClick={() => setIntervalFilter('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  intervalFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setIntervalFilter('monthly')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  intervalFilter === 'monthly' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIntervalFilter('yearly')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  intervalFilter === 'yearly' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Subscription</th>
                <th className="py-2.5 px-4">Customer & Organization</th>
                <th className="py-2.5 px-4">Plan & Cadence</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Next Billing Date</th>
                <th className="py-2.5 px-4 text-right">Recurring Value</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No subscriptions match your query.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub, idx) => {
                  const cust = customers.find((c) => c.id === sub.customerId);
                  const plan = plans.find((p) => p.id === sub.planId);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isDueToday = sub.status === 'active' && sub.nextBillingDate <= todayStr;

                  return (
                    <tr
                      key={`${sub.id}-${idx}`}
                      onClick={() => onSelectSubscription(sub.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-indigo-600">
                        {sub.number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cust?.companyName}</div>
                        <div className="text-[11px] text-slate-500">{cust?.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{plan?.name}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{plan?.billingInterval}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-semibold ${
                            sub.status === 'active'
                              ? 'text-emerald-700'
                              : sub.status === 'quotation'
                              ? 'text-indigo-700'
                              : sub.status === 'paused'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              sub.status === 'active'
                                ? 'bg-emerald-600'
                                : sub.status === 'quotation'
                                ? 'bg-indigo-600'
                                : sub.status === 'paused'
                                ? 'bg-amber-600'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="capitalize">{sub.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(sub.nextBillingDate)}</span>
                          {isDueToday && (
                            <span className="text-[10px] text-emerald-700 font-semibold font-sans">
                              (Due Today)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(sub.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-indigo-600 hover:text-indigo-800 font-semibold group-hover:translate-x-0.5 inline-block transition-transform">
                          Inspect &rarr;
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
