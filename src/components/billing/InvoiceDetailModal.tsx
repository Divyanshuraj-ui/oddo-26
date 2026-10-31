import React, { useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Mail,
  Printer,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onRecordPayment: (invoiceId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onRecordPayment,
}) => {
  const { customers, subscriptions, updateInvoiceStatus, sendInvoiceToCustomer, cancelInvoice, currentUser } =
    useApp();
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const customer = customers.find((c) => c.id === invoice.customerId);
  const subscription = subscriptions.find((s) => s.id === invoice.subscriptionId);

  const canEdit = currentUser.role !== 'customer';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 text-sm">{invoice.number}</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                invoice.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'overdue'
                  ? 'bg-rose-100 text-rose-800'
                  : invoice.status === 'confirmed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span className="capitalize">{invoice.status}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => updateInvoiceStatus(invoice.id, 'confirmed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Invoice</span>
                  </button>
                )}

                <button
                  onClick={() => sendInvoiceToCustomer(invoice.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{invoice.sentAt ? 'Resend Email' : 'Send by Email'}</span>
                </button>

                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <button
                    onClick={() => onRecordPayment(invoice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <span>Record Payment</span>
                  </button>
                )}

                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <button
                    onClick={() => cancelInvoice(invoice.id)}
                    className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}

            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Slip Content */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-600 text-white rounded flex items-center justify-center font-bold text-xs">
                  B
                </span>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  Brightloop Software
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">100 Enterprise Way, Suite 400</p>
              <p className="text-xs text-slate-500">San Francisco, CA 94107 · billing@brightloop.io</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Official Invoice
              </span>
              <span className="text-2xl font-extrabold font-mono text-slate-900 block mt-1">
                {invoice.number}
              </span>
              {subscription && (
                <span className="text-xs font-mono text-indigo-600 font-semibold block mt-1">
                  Ref: {subscription.number}
                </span>
              )}
            </div>
          </div>

          {/* Customer & Billing Meta */}
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Billed To
              </span>
              <p className="text-sm font-bold text-slate-900">{customer?.companyName}</p>
              <p className="text-slate-600 mt-0.5">{customer?.name}</p>
              <p className="text-slate-500">{customer?.email}</p>
              <p className="text-slate-500">{customer?.address}</p>
              <p className="text-slate-500 mt-1 font-mono">Tax ID: {customer?.taxNumber}</p>
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-slate-400 font-medium">Invoice Date: </span>
                <span className="font-mono font-semibold text-slate-800">{formatDate(invoice.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Due Date: </span>
                <span
                  className={`font-mono font-bold ${
                    invoice.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Payment Terms: </span>
                <span className="font-semibold uppercase text-slate-800">{invoice.paymentTerms}</span>
              </div>
              {invoice.sentAt && (
                <div className="text-slate-400 text-[11px]">
                  <span>Dispatched: {formatDateTime(invoice.sentAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-4">Item Description</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Tax Rate</th>
                  <th className="py-2.5 px-4 text-right">Tax ($)</th>
                  <th className="py-2.5 px-4 text-right">Discount</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines.map((l, idx) => (
                  <tr key={`${l.id}-${idx}`}>
                    <td className="py-3 px-4 font-medium text-slate-900">{l.description}</td>
                    <td className="py-3 px-4 text-center font-mono">{l.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrency(l.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                      {l.taxRate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatCurrency(l.taxAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600">
                      {l.discountAmount > 0 ? `-${formatCurrency(l.discountAmount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatCurrency(l.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Box */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                </div>

                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount Applied</span>
                    <span className="font-mono tabular-nums">-{formatCurrency(invoice.discountTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Calculated Tax</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.taxTotal)}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>Total Amount</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.grandTotal)}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Amount Paid</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.amountPaid)}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-rose-600 border-t border-slate-200 pt-1.5">
                  <span>Balance Due</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.amountDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Bank Details */}
          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Payment Instructions</p>
            <p>Direct Wire: JPMorgan Chase · Account # 982183921 · Routing # 021000021</p>
            <p>Or settle via customer portal credit card payment. All taxes calculated per jurisdiction rules.</p>
            {invoice.notes && <p className="text-[11px] text-slate-500 italic mt-1">{invoice.notes}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
