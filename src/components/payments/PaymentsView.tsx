import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PaymentsViewProps {
  onOpenRecordPayment: (invoiceId?: string) => void;
  onSelectInvoice: (invoiceId: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onOpenRecordPayment,
  onSelectInvoice,
}) => {
  const { payments, invoices, customers, chaseOverdueInvoice, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const overdueInvoices = useMemo(() => {
    return invoices.filter((i) => i.status === 'overdue');
  }, [invoices]);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter((i) => i.status === 'confirmed' || i.status === 'overdue');
  }, [invoices]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inv = invoices.find((i) => i.id === p.invoiceId);
      const cust = customers.find((c) => c.id === p.customerId);
      return (
        p.number.toLowerCase().includes(q) ||
        inv?.number.toLowerCase().includes(q) ||
        cust?.companyName.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q) ||
        (p.transactionRef && p.transactionRef.toLowerCase().includes(q))
      );
    });
  }, [payments, invoices, customers, searchQuery]);

  const canManage = currentUser.role !== 'customer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payments & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-method incoming payments, reconcile balances against invoices, and chase outstanding receivables.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => onOpenRecordPayment()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Received Payment</span>
          </button>
        )}
      </div>

      {/* Overdue Invoices Chaser Strip (Scene 6) */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Outstanding Overdue Invoices ({overdueInvoices.length})
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700">
              Total Overdue:{' '}
              {formatCurrency(overdueInvoices.reduce((a, b) => a + b.amountDue, 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueInvoices.map((inv, idx) => {
              const cust = customers.find((c) => c.id === inv.customerId);
              return (
                <div
                  key={`${inv.id}-${idx}`}
                  className="bg-white p-3.5 rounded-lg border border-rose-200 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {inv.number}
                      </span>
                      <span className="text-[11px] text-slate-500">· {cust?.companyName}</span>
                    </div>
                    <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                      Due: {formatDate(inv.dueDate)} · Balance: {formatCurrency(inv.amountDue)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => chaseOverdueInvoice(inv.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Chase</span>
                    </button>
                    {canManage && (
                      <button
                        onClick={() => onOpenRecordPayment(inv.id)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payments Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">Recorded Payments Ledger</h2>
            <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
              Total: {formatCurrency(totalCollected)}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by payment #, invoice, method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Invoice Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Transaction / Note</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay, idx) => {
                  const inv = invoices.find((i) => i.id === pay.invoiceId);
                  const cust = customers.find((c) => c.id === pay.customerId);

                  return (
                    <tr key={`${pay.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {pay.number}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 font-medium">
                        {inv ? (
                          <button
                            onClick={() => onSelectInvoice(inv.id)}
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{inv.number}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{cust?.companyName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                          {pay.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {formatDate(pay.date)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="font-mono text-slate-700">{pay.transactionRef}</div>
                        <div className="text-slate-400 truncate max-w-xs">{pay.note}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-emerald-600 text-sm">
                        +{formatCurrency(pay.amount)}
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
