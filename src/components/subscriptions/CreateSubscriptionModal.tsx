import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubscriptionLine } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (subscriptionId: string) => void;
}

export const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const {
    customers,
    plans,
    products,
    quotationTemplates,
    createSubscriptionFromTemplate,
    createCustomSubscription,
    taxRules,
  } = useApp();

  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [selectedCustomer, setSelectedCustomer] = useState<string>(customers[0]?.id || '');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(quotationTemplates[0]?.id || '');
  const [selectedPlan, setSelectedPlan] = useState<string>(plans[0]?.id || '');
  const [paymentTerms, setPaymentTerms] = useState<'immediate' | 'net15' | 'net30' | 'net60'>('net15');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Custom lines state
  const [lines, setLines] = useState<SubscriptionLine[]>([
    {
      id: 'line-1',
      productId: products[0]?.id || '',
      variantId: products[0]?.variants[0]?.id,
      quantity: 1,
      unitPrice: products[0]?.salesPrice + (products[0]?.variants[0]?.priceSurcharge || 0),
      discountAmount: 0,
      taxRate: 8.25,
      amount: products[0]?.salesPrice + (products[0]?.variants[0]?.priceSurcharge || 0),
    },
  ]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    const prod = products[0];
    const unitPrice = prod.salesPrice;
    const newLine: SubscriptionLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: prod.id,
      variantId: prod.variants[0]?.id,
      quantity: 1,
      unitPrice,
      discountAmount: 0,
      taxRate: 8.25,
      amount: unitPrice,
    };
    setLines([...lines, newLine]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const handleLineChange = (
    id: string,
    field: 'productId' | 'variantId' | 'quantity' | 'unitPrice',
    val: any
  ) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;

        let updated = { ...l, [field]: val };

        if (field === 'productId') {
          const prod = products.find((p) => p.id === val);
          if (prod) {
            const firstVar = prod.variants[0];
            const base = prod.salesPrice + (firstVar?.priceSurcharge || 0);
            updated.variantId = firstVar?.id;
            updated.unitPrice = base;
          }
        } else if (field === 'variantId') {
          const prod = products.find((p) => p.id === updated.productId);
          const variant = prod?.variants.find((v) => v.id === val);
          const base = (prod?.salesPrice || 0) + (variant?.priceSurcharge || 0);
          updated.unitPrice = base;
        }

        updated.amount = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  };

  const customSubtotal = lines.reduce((acc, l) => acc + l.amount, 0);
  const customTax = Number(((customSubtotal * 0.0825)).toFixed(2));
  const customTotal = customSubtotal + customTax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'template') {
      const newSub = createSubscriptionFromTemplate(selectedTemplate, selectedCustomer, customNotes);
      onCreated(newSub.id);
      onClose();
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);

      const newSub = createCustomSubscription({
        customerId: selectedCustomer,
        planId: selectedPlan,
        status: 'quotation',
        startDate: todayStr,
        expiryDate: expiry.toISOString().split('T')[0],
        nextBillingDate: todayStr,
        paymentTerms,
        lines,
        subtotal: customSubtotal,
        discountTotal: 0,
        taxTotal: customTax,
        totalAmount: customTotal,
        notes: customNotes,
      });

      onCreated(newSub.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Create New Quotation / Subscription
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Build an offer from a standardized template or configure custom line items.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'template' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Use Quotation Template (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Line Configuration
            </button>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.name} · {c.email})
                </option>
              ))}
            </select>
          </div>

          {mode === 'template' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Quotation Template
              </label>
              <div className="space-y-2">
                {quotationTemplates.map((tmpl) => {
                  const plan = plans.find((p) => p.id === tmpl.planId);
                  const isSelected = selectedTemplate === tmpl.id;

                  return (
                    <label
                      key={tmpl.id}
                      className={`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="template"
                            checked={isSelected}
                            onChange={() => setSelectedTemplate(tmpl.id)}
                            className="text-indigo-600"
                          />
                          <span className="font-bold text-slate-900">{tmpl.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          Valid {tmpl.validityDays} days · {plan?.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-5">{tmpl.description}</p>
                      <div className="mt-2 pl-5 flex flex-wrap gap-2 text-[10px] text-slate-600">
                        {tmpl.lines.map((l, i) => {
                          const prod = products.find((p) => p.id === l.productId);
                          const variant = prod?.variants.find((v) => v.id === l.variantId);
                          return (
                            <span key={i} className="bg-slate-100 px-2 py-0.5 rounded">
                              {l.quantity}x {prod?.name} {variant ? `(${variant.value})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Billing Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billingInterval} billing · Base {formatCurrency(p.baseCost)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line items builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Line Items & Variants</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line) => {
                    const prod = products.find((p) => p.id === line.productId);
                    return (
                      <div
                        key={line.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-2 items-center text-xs"
                      >
                        <div className="flex-1 min-w-[140px]">
                          <select
                            value={line.productId}
                            onChange={(e) => handleLineChange(line.id, 'productId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1.5"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (${p.salesPrice})
                              </option>
                            ))}
                          </select>
                        </div>

                        {prod && prod.variants.length > 0 && (
                          <div className="min-w-[140px]">
                            <select
                              value={line.variantId || ''}
                              onChange={(e) => handleLineChange(line.id, 'variantId', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1.5 text-indigo-700"
                            >
                              {prod.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.value} (+${v.priceSurcharge})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) =>
                              handleLineChange(line.id, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-center font-mono"
                          />
                        </div>

                        <div className="w-24 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(line.amount)}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          disabled={lines.length === 1}
                          className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 p-3 bg-slate-100 rounded-lg flex justify-between text-xs font-semibold text-slate-800">
                  <span>Estimated Total (incl. 8.25% Tax)</span>
                  <span className="font-mono">{formatCurrency(customTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Terms & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
              >
                <option value="immediate">Immediate Payment</option>
                <option value="net15">Net 15 Days</option>
                <option value="net30">Net 30 Days</option>
                <option value="net60">Net 60 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Notes</label>
              <input
                type="text"
                placeholder="Custom terms, SLA notes, or references..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              Generate Quotation &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
