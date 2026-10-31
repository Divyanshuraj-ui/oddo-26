import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Package,
  Receipt,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CustomerPortalViewProps {
  onOpenInvoice: (invoiceId: string) => void;
  onPayInvoice: (invoiceId: string) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  onOpenInvoice,
  onPayInvoice,
}) => {
  const {
    currentUser,
    customers,
    subscriptions,
    plans,
    products,
    invoices,
    toggleCustomerAddon,
  } = useApp();

  // Find customer account
  const customerId = currentUser.customerId || customers[0].id;
  const customer = customers.find((c) => c.id === customerId) || customers[0];

  // Subscriptions belonging strictly to this customer
  const customerSubs = subscriptions.filter((s) => s.customerId === customer.id);
  const activeSub = customerSubs.find((s) => s.status === 'active') || customerSubs[0];

  // Invoices belonging strictly to this customer
  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);

  // Available add-ons
  const addonProducts = products.filter((p) => p.isAddon && p.type === 'addon');

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {customer.companyName.charAt(0)}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {customer.companyName}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Self-Service Account Portal · Logged in as{' '}
            <span className="font-semibold text-slate-800">{customer.name}</span> ({customer.email})
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Account ID</span>
            <span className="font-bold text-slate-800">{customer.id}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Payment Terms</span>
            <span className="font-bold uppercase text-slate-800">{customer.paymentTerms}</span>
          </div>
        </div>
      </div>

      {/* Active Subscription & Self-Service Addon Switchboard */}
      {activeSub ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{activeSub.number}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize">
                  {activeSub.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Plan:{' '}
                <span className="font-semibold text-slate-900">
                  {plans.find((p) => p.id === activeSub.planId)?.name}
                </span>{' '}
                · Recurring Next Billing:{' '}
                <span className="font-mono font-semibold text-indigo-600">
                  {formatDate(activeSub.nextBillingDate)}
                </span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Recurring Amount</span>
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {formatCurrency(activeSub.totalAmount)}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Current Active Lines */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Active Included Services & Licenses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeSub.lines.map((l) => {
                  const prod = products.find((p) => p.id === l.productId);
                  const variant = prod?.variants.find((v) => v.id === l.variantId);
                  return (
                    <div
                      key={l.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{prod?.name}</div>
                        {variant && (
                          <div className="text-[11px] text-indigo-600">
                            {variant.attribute}: {variant.value}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-500 font-mono">
                          Quantity: {l.quantity}x
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(l.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Self-Service Addon Switchboard (Scene 2) */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Self-Service Add-on Switchboard
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Switch optional add-on modules on or off without having to contact support.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addonProducts.map((addon) => {
                  const isEnabled = activeSub.lines.some((l) => l.productId === addon.id);

                  return (
                    <div
                      key={addon.id}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isEnabled
                          ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900">{addon.name}</h3>
                          {isEnabled && (
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{addon.notes}</p>
                        <span className="font-mono font-bold text-xs text-slate-800 mt-2 block">
                          +{formatCurrency(addon.salesPrice)} / cycle
                        </span>
                      </div>

                      <button
                        onClick={() => toggleCustomerAddon(activeSub.id, addon.id, !isEnabled)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                          isEnabled
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                        }`}
                      >
                        {isEnabled ? 'Turn Off' : 'Turn On'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
          No active subscriptions on record. Contact sales to activate a plan.
        </div>
      )}

      {/* Customer Invoices & Direct Payment */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>My Invoices & Payment Receipts ({customerInvoices.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download receipts or pay outstanding recurring bills directly online.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No invoices generated yet for this account.
                  </td>
                </tr>
              ) : (
                customerInvoices.map((inv, idx) => (
                  <tr key={`${inv.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {inv.number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        <span className="capitalize">{inv.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-rose-600">
                      {formatCurrency(inv.amountDue)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.amountDue > 0 && (
                          <button
                            onClick={() => onPayInvoice(inv.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs shadow-xs"
                          >
                            Pay Now
                          </button>
                        )}
                        <button
                          onClick={() => onOpenInvoice(inv.id)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded text-xs font-medium"
                        >
                          View Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
