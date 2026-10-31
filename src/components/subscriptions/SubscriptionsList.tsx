import React, { useMemo, useState } from 'react';
import {
  Clock,
  Filter,
  Layers,
  Plus,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubscriptionStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SubscriptionsListProps {
  onSelectSubscription: (id: string) => void;
  onOpenCreate: () => void;
  defaultFilter?: string;
}

export const SubscriptionsList: React.FC<SubscriptionsListProps> = ({
  onSelectSubscription,
  onOpenCreate,
  defaultFilter = 'all',
}) => {
  const { subscriptions, customers, plans } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>(defaultFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cust = customers.find((c) => c.id === sub.customerId);
        const plan = plans.find((p) => p.id === sub.planId);
        return (
          sub.number.toLowerCase().includes(q) ||
          cust?.companyName.toLowerCase().includes(q) ||
          cust?.name.toLowerCase().includes(q) ||
          plan?.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [subscriptions, customers, plans, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscriptions & Quotations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end lifecycle management: Draft &rarr; Quotation &rarr; Confirmed &rarr; Active &rarr; Closed.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Quote / Subscription</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 overflow-x-auto">
          {['all', 'active', 'quotation', 'draft', 'paused', 'closed'].map((st) => {
            const count =
              st === 'all'
                ? subscriptions.length
                : subscriptions.filter((s) => s.status === st).length;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md transition-colors capitalize whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search subscriptions, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full md:w-64"
          />
        </div>
      </div>

      {/* Subscriptions Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Subscription #</th>
                <th className="py-3 px-4">Customer & Account</th>
                <th className="py-3 px-4">Plan & Terms</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Recurring Value</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No subscriptions found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub, idx) => {
                  const cust = customers.find((c) => c.id === sub.customerId);
                  const plan = plans.find((p) => p.id === sub.planId);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isDue = sub.status === 'active' && sub.nextBillingDate <= todayStr;

                  return (
                    <tr
                      key={`${sub.id}-${idx}`}
                      onClick={() => onSelectSubscription(sub.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-indigo-600">{sub.number}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {sub.lines.length} line item(s)
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{cust?.companyName}</div>
                        <div className="text-[11px] text-slate-500">{cust?.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{plan?.name}</div>
                        <div className="text-[11px] text-slate-500 uppercase font-mono">
                          {sub.paymentTerms} · {plan?.billingInterval}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <div>Start: {formatDate(sub.startDate)}</div>
                        <div className="text-slate-400">Exp: {formatDate(sub.expiryDate)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                            sub.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sub.status === 'quotation'
                              ? 'bg-indigo-50 text-indigo-700'
                              : sub.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700'
                              : sub.status === 'paused'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="capitalize">{sub.status}</span>
                        </span>
                        {isDue && (
                          <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">
                            ● Due for billing
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(sub.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">
                          Details &rarr;
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
