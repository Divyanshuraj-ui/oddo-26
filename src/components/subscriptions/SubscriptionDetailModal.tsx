import React from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  History,
  Pause,
  Play,
  Receipt,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Subscription } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

interface SubscriptionDetailModalProps {
  subscription: Subscription | null;
  onClose: () => void;
  onOpenInvoice: (invoiceId: string) => void;
}

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  subscription,
  onClose,
  onOpenInvoice,
}) => {
  const {
    customers,
    plans,
    products,
    discountRules,
    updateSubscriptionStatus,
    generateInvoiceForSubscription,
    invoices,
    currentUser,
  } = useApp();

  if (!subscription) return null;

  const customer = customers.find((c) => c.id === subscription.customerId);
  const plan = plans.find((p) => p.id === subscription.planId);
  const discountRule = discountRules.find((d) => d.id === subscription.appliedDiscountRuleId);

  // Invoices linked to this subscription
  const linkedInvoices = invoices.filter((i) => i.subscriptionId === subscription.id);

  const canEdit = currentUser.role !== 'customer';

  const handleGenerateInvoice = () => {
    const inv = generateInvoiceForSubscription(subscription.id);
    if (inv) {
      onOpenInvoice(inv.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/60">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-slate-900">
                {subscription.number}
              </span>
              <span
                className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  subscription.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : subscription.status === 'quotation'
                    ? 'bg-indigo-100 text-indigo-800'
                    : subscription.status === 'confirmed'
                    ? 'bg-blue-100 text-blue-800'
                    : subscription.status === 'paused'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                <span className="capitalize">{subscription.status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Customer:{' '}
              <span className="font-medium text-slate-800">{customer?.companyName}</span>{' '}
              ({customer?.name} &lt;{customer?.email}&gt;)
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lifecycle Action Bar (For turning Quote -> Confirmed -> Active -> Closed) */}
          {canEdit && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-indigo-950">Subscription Lifecycle Actions</p>
                <p className="text-[11px] text-indigo-700">
                  Current Stage: <span className="uppercase font-semibold">{subscription.status}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {subscription.status === 'draft' && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'quotation', 'Dispatched to customer as official quote')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Send Quotation to Customer</span>
                  </button>
                )}

                {subscription.status === 'quotation' && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'confirmed', 'Quotation accepted by customer')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm Quotation</span>
                  </button>
                )}

                {subscription.status === 'confirmed' && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'active', 'Activated and queued for recurring billing schedule')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Activate Subscription</span>
                  </button>
                )}

                {subscription.status === 'active' && plan?.allowPause && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'paused', 'Customer requested temporary hold')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Subscription</span>
                  </button>
                )}

                {subscription.status === 'paused' && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'active', 'Resumed billing')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume Subscription</span>
                  </button>
                )}

                {(subscription.status === 'active' || subscription.status === 'paused') && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'closed', 'Contract ended or cancelled early')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Subscription</span>
                  </button>
                )}

                {subscription.status === 'closed' && (
                  <button
                    onClick={() => updateSubscriptionStatus(subscription.id, 'active', 'Contract renewed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Renew Contract</span>
                  </button>
                )}

                {/* Direct Billing Trigger */}
                {subscription.status === 'active' && (
                  <button
                    onClick={handleGenerateInvoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Generate Invoice Now</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 font-medium">Plan</span>
              <p className="font-semibold text-slate-800 mt-0.5">{plan?.name}</p>
              <span className="text-[11px] text-slate-500 capitalize">{plan?.billingInterval} recurring</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Contract Term</span>
              <p className="font-mono text-slate-800 mt-0.5 font-medium">
                {formatDate(subscription.startDate)}
              </p>
              <span className="text-[11px] text-slate-500">Exp: {formatDate(subscription.expiryDate)}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Next Billing Date</span>
              <p className="font-mono font-bold text-indigo-600 mt-0.5">
                {formatDate(subscription.nextBillingDate)}
              </p>
              <span className="text-[11px] text-slate-500">
                Last: {subscription.lastBilledDate ? formatDate(subscription.lastBilledDate) : 'Not yet billed'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Payment Terms</span>
              <p className="font-semibold uppercase text-slate-800 mt-0.5">{subscription.paymentTerms}</p>
              <span className="text-[11px] text-slate-500">Due upon cycle</span>
            </div>
          </div>

          {/* Product Lines Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Subscription Product Lines
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase border-b border-slate-200">
                    <th className="py-2.5 px-4">Item & Variant</th>
                    <th className="py-2.5 px-4 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Tax Rate</th>
                    <th className="py-2.5 px-4 text-right">Discount</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscription.lines.map((line) => {
                    const prod = products.find((p) => p.id === line.productId);
                    const variant = prod?.variants.find((v) => v.id === line.variantId);

                    return (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{prod?.name || 'Product'}</div>
                          {variant && (
                            <div className="text-[11px] text-indigo-600">
                              {variant.attribute}: {variant.value} (+${variant.priceSurcharge})
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-medium">{line.quantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {formatCurrency(line.unitPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                          {line.taxRate}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-600">
                          {line.discountAmount > 0 ? `-${formatCurrency(line.discountAmount)}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                          {formatCurrency(line.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatCurrency(subscription.subtotal)}</span>
                  </div>

                  {subscription.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount {discountRule ? `(${discountRule.name})` : ''}</span>
                      <span className="font-mono tabular-nums">-{formatCurrency(subscription.discountTotal)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Calculated Taxes</span>
                    <span className="font-mono tabular-nums">{formatCurrency(subscription.taxTotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Recurring Total</span>
                    <span className="font-mono tabular-nums text-indigo-600">
                      {formatCurrency(subscription.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoices History linked to this subscription */}
          {linkedInvoices.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Invoices Generated for this Subscription ({linkedInvoices.length})
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {linkedInvoices.map((inv, idx) => (
                  <div
                    key={`${inv.id}-${idx}`}
                    onClick={() => onOpenInvoice(inv.id)}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      <div>
                        <span className="font-mono font-bold text-slate-900">{inv.number}</span>
                        <span className="text-slate-400 ml-2 font-mono">Billed {formatDate(inv.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-semibold capitalize text-xs ${
                          inv.status === 'paid'
                            ? 'text-emerald-700'
                            : inv.status === 'overdue'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(inv.grandTotal)}
                      </span>
                      <span className="text-indigo-600 text-xs font-medium">View &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity / Audit History */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail & Lifecycle History</span>
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              {subscription.history.map((h) => (
                <div key={h.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{h.action}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-[11px] text-slate-500">by {h.performedBy}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(h.timestamp)}
                      </span>
                    </div>
                    {h.note && <p className="text-[11px] text-slate-600 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Internal ID: <span className="font-mono">{subscription.id}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
