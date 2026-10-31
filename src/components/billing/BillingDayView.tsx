import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  PlayCircle,
  Receipt,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BillingDayViewProps {
  onSelectInvoice: (id: string) => void;
  onRecordPayment: (id: string) => void;
}

export const BillingDayView: React.FC<BillingDayViewProps> = ({
  onSelectInvoice,
  onRecordPayment,
}) => {
  const {
    subscriptions,
    invoices,
    customers,
    plans,
    runBillingDayBatch,
    sendInvoiceToCustomer,
    updateInvoiceStatus,
    currentUser,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastBatchResult, setLastBatchResult] = useState<{
    ran: boolean;
    count: number;
  } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Active subscriptions due today
  const dueSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (sub.status !== 'active') return false;
      const isDue = sub.nextBillingDate <= todayStr;
      const notBilledToday = sub.lastBilledDate !== todayStr;
      return isDue && notBilledToday;
    });
  }, [subscriptions, todayStr]);

  const handleRunBatch = () => {
    const res = runBillingDayBatch();
    setLastBatchResult({ ran: true, count: res.processedCount });
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cust = customers.find((c) => c.id === inv.customerId);
        return (
          inv.number.toLowerCase().includes(q) ||
          cust?.companyName.toLowerCase().includes(q) ||
          cust?.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, customers, statusFilter, searchQuery]);

  const canManage = currentUser.role !== 'customer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing Day & Recurring Invoicing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Zero-manual data entry. Automatically generates invoices from active subscriptions, calculates taxes, applies discounts, and schedules renewals.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleRunBatch}
            disabled={dueSubscriptions.length === 0}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all ${
              dueSubscriptions.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>
              {dueSubscriptions.length > 0
                ? `Run Billing Batch (${dueSubscriptions.length} Due)`
                : 'All Subscriptions Billed for Today'}
            </span>
          </button>
        )}
      </div>

      {/* Billing Automation Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">
              Subscriptions Due Today
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {dueSubscriptions.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Ready for automated generation</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">
              Double-Billing Protection
            </span>
            <div className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Enforced & Guaranteed</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Subscriptions will never be billed twice or skipped
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">
              Total Invoices on Record
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {invoices.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {invoices.filter((i) => i.status === 'paid').length} paid ·{' '}
              {invoices.filter((i) => i.status === 'overdue').length} overdue
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Invoices List Section */}
      <div className="space-y-4">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 overflow-x-auto">
            {['all', 'confirmed', 'paid', 'overdue', 'draft', 'cancelled'].map((st) => {
              const count =
                st === 'all' ? invoices.length : invoices.filter((i) => i.status === st).length;
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
              placeholder="Filter invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date / Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Tax & Discount</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const cust = customers.find((c) => c.id === inv.customerId);

                    return (
                      <tr
                        key={`${inv.id}-${idx}`}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td
                          onClick={() => onSelectInvoice(inv.id)}
                          className="py-3 px-4 font-mono font-bold text-indigo-600 cursor-pointer hover:underline"
                        >
                          {inv.number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{cust?.companyName}</div>
                          <div className="text-[11px] text-slate-500">{cust?.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          <div>Issued: {formatDate(inv.date)}</div>
                          <div
                            className={
                              inv.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-400'
                            }
                          >
                            Due: {formatDate(inv.dueDate)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700'
                                : inv.status === 'confirmed'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="capitalize">{inv.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-mono tabular-nums">
                          <div>Tax: {formatCurrency(inv.taxTotal)}</div>
                          {inv.discountTotal > 0 && (
                            <div className="text-emerald-600">
                              Disc: -{formatCurrency(inv.discountTotal)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                          <span
                            className={inv.amountDue > 0 ? 'text-slate-900' : 'text-emerald-600'}
                          >
                            {formatCurrency(inv.amountDue)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button
                                onClick={() => onRecordPayment(inv.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                              >
                                Pay
                              </button>
                            )}

                            {canManage && (
                              <button
                                onClick={() => sendInvoiceToCustomer(inv.id)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                title="Send Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onSelectInvoice(inv.id)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs ml-1"
                            >
                              View
                            </button>
                          </div>
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
    </div>
  );
};
