import React, { useState } from 'react';
import { CreditCard, DollarSign, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInvoiceId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedInvoiceId,
}) => {
  const { invoices, customers, recordPayment } = useApp();

  const unpaidInvoices = invoices.filter((i) => i.amountDue > 0 && i.status !== 'cancelled');

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    preselectedInvoiceId || unpaidInvoices[0]?.id || ''
  );
  const [method, setMethod] = useState<PaymentMethod>('credit_card');
  const [note, setNote] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const targetInvoice = invoices.find((i) => i.id === selectedInvoiceId);
  const customer = targetInvoice ? customers.find((c) => c.id === targetInvoice.customerId) : null;

  // Sync amount when target invoice changes
  React.useEffect(() => {
    if (targetInvoice) {
      setAmount(targetInvoice.amountDue);
      setErrorMsg('');
    }
  }, [targetInvoice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetInvoice) {
      setErrorMsg('Please select a valid invoice.');
      return;
    }

    const res = recordPayment(targetInvoice.id, Number(amount), method, note);
    if (!res.success) {
      setErrorMsg(res.error || 'Payment failed.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Record Payment</h2>
              <p className="text-[11px] text-slate-500">Reconcile against invoice ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Invoice Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Invoice</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
              required
            >
              {unpaidInvoices.length === 0 ? (
                <option value="">No outstanding invoices</option>
              ) : (
                unpaidInvoices.map((inv, idx) => {
                  const cust = customers.find((c) => c.id === inv.customerId);
                  return (
                    <option key={`${inv.id}-${idx}`} value={inv.id}>
                      {inv.number} - {cust?.companyName} (Due: ${inv.amountDue.toFixed(2)})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {targetInvoice && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Customer:</span>
                <span className="font-semibold text-slate-900">{customer?.companyName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Invoiced:</span>
                <span className="font-mono tabular-nums">{formatCurrency(targetInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Already Paid:</span>
                <span className="font-mono tabular-nums text-emerald-600">
                  {formatCurrency(targetInvoice.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Balance Due:</span>
                <span className="font-mono tabular-nums text-rose-600">
                  {formatCurrency(targetInvoice.amountDue)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={targetInvoice?.amountDue || 999999}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Enter partial amount or keep full remaining balance to settle invoice in full.
            </span>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
            >
              <option value="credit_card">Credit Card (Stripe / Gateway)</option>
              <option value="bank_transfer">Direct Bank Wire / Swift</option>
              <option value="ach">ACH Electronic Transfer</option>
              <option value="stripe">Stripe Subscription Auto-charge</option>
              <option value="check">Check / Corporate Draft</option>
              <option value="cash">Cash Settlement</option>
            </select>
          </div>

          {/* Reference / Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Note / Reference
            </label>
            <input
              type="text"
              placeholder="e.g., Bank wire transaction ID, check number..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetInvoice || targetInvoice.amountDue <= 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              Confirm Payment & Settle &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
