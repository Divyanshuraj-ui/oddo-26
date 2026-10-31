import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Percent,
  Plus,
  Receipt,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DiscountRule, DiscountScope, DiscountType, TaxRule } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const DiscountsTaxesView: React.FC = () => {
  const {
    discountRules,
    taxRules,
    products,
    addDiscountRule,
    updateDiscountRule,
    deleteDiscountRule,
    addTaxRule,
    currentUser,
    switchUserRole,
  } = useApp();

  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);

  // New Discount Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('percentage');
  const [value, setValue] = useState<number>(10);
  const [minQty, setMinQty] = useState<number | undefined>(undefined);
  const [minSpend, setMinSpend] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [usageLimit, setUsageLimit] = useState<number>(50);
  const [scope, setScope] = useState<DiscountScope>('whole_subscription');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // New Tax Form State
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState<number>(10);
  const [taxDesc, setTaxDesc] = useState('');

  const isAdmin = currentUser.role === 'admin';

  const handleCreateDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isAdmin) {
      setFormError('Only administrators can create discount rules.');
      return;
    }

    const res = addDiscountRule({
      name,
      code: code.toUpperCase(),
      type,
      value: Number(value),
      minQuantity: minQty ? Number(minQty) : undefined,
      minPurchaseAmount: minSpend ? Number(minSpend) : undefined,
      startDate,
      endDate,
      usageLimit: Number(usageLimit),
      scope,
      applicableProductIds: scope === 'specific_products' ? selectedProductIds : undefined,
      isActive: true,
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to create rule.');
      return;
    }

    setName('');
    setCode('');
    setShowAddDiscountModal(false);
  };

  const handleCreateTax = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxName.trim()) return;

    addTaxRule({
      name: taxName,
      rate: Number(taxRate),
      description: taxDesc,
      isDefault: false,
    });

    setTaxName('');
    setTaxDesc('');
    setShowAddTaxModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Discount Rules & Tax Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scene 5 Specification: Only administrators can create discount rules (seat volume thresholds, usage caps, and automated invoice triggers).
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddTaxModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tax Rule</span>
            </button>
            <button
              onClick={() => setShowAddDiscountModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Discount Rule</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs text-amber-800">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin-only view: You are currently viewing as {currentUser.role}.</span>
            <button
              onClick={() => switchUserRole('admin')}
              className="font-bold underline ml-1 hover:text-amber-950"
            >
              Switch to Admin
            </button>
          </div>
        )}
      </div>

      {/* Discount Rules Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-600" />
              <span>Automated Discount Rules ({discountRules.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Applies automatically to eligible subscriptions and subsequent invoices until expired or limit reached.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Rule Name & Code</th>
                <th className="py-3 px-4">Benefit</th>
                <th className="py-3 px-4">Threshold Condition</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Usage Limit</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discountRules.map((rule) => {
                const isExpired = new Date(rule.endDate) < new Date();
                const isLimitReached = rule.timesUsed >= rule.usageLimit;

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{rule.name}</div>
                      <span className="font-mono text-[11px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">
                        {rule.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {rule.type === 'percentage' ? `${rule.value}% OFF` : `-${formatCurrency(rule.value)}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {rule.minQuantity && (
                        <div>Min Seats: <span className="font-mono font-semibold">{rule.minQuantity}</span></div>
                      )}
                      {rule.minPurchaseAmount && (
                        <div>Min Spend: <span className="font-mono font-semibold">{formatCurrency(rule.minPurchaseAmount)}</span></div>
                      )}
                      {!rule.minQuantity && !rule.minPurchaseAmount && (
                        <span className="text-slate-400">No minimum condition</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 capitalize">
                      {rule.scope === 'whole_subscription' ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          Entire Subscription
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px]">
                          Specific Products
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {formatDate(rule.startDate)} &rarr; {formatDate(rule.endDate)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <span className="font-bold">{rule.timesUsed}</span> / {rule.usageLimit} used
                    </td>
                    <td className="py-3.5 px-4">
                      {isLimitReached ? (
                        <span className="text-rose-600 font-semibold text-[11px]">Cap Reached</span>
                      ) : isExpired ? (
                        <span className="text-slate-400 font-semibold text-[11px]">Expired</span>
                      ) : rule.isActive ? (
                        <span className="text-emerald-700 font-semibold text-[11px]">Active</span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-[11px]">Inactive</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => deleteDiscountRule(rule.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Rules Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Tax Rules Engine ({taxRules.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated jurisdiction tax calculation for recurring subscription invoices.
            </p>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {taxRules.map((t) => (
            <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{t.name}</span>
                <span className="font-mono text-base font-bold text-indigo-600">{t.rate}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{t.description}</p>
              {t.isDefault && (
                <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Default Rule
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Discount Modal */}
      {showAddDiscountModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Create New Discount Rule</h2>
                <p className="text-[11px] text-slate-500">Admin-exclusive discount engine</p>
              </div>
              <button
                onClick={() => setShowAddDiscountModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiscount} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Volume Seats Promo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SEATS20"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 uppercase font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Dollar ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Value ({type === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Conditions */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Eligibility Threshold Conditions
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Min Quantity (e.g. Seats &ge; 10)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={minQty || ''}
                      onChange={(e) => setMinQty(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Min Purchase Amount ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2500"
                      value={minSpend || ''}
                      onChange={(e) =>
                        setMinSpend(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Limit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value) || 1)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="whole_subscription">Applies to Whole Subscription</option>
                  <option value="specific_products">Applies to Specific Products</option>
                </select>
              </div>

              {scope === 'specific_products' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Eligible Products
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {products.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds([...selectedProductIds, p.id]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDiscountModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Save Discount Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tax Modal */}
      {showAddTaxModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Add Tax Rate</h2>
              <button
                onClick={() => setShowAddTaxModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTax} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name</label>
                <input
                  type="text"
                  placeholder="e.g. EU Harmonized VAT"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Jurisdiction notes..."
                  value={taxDesc}
                  onChange={(e) => setTaxDesc(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaxModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Add Tax
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
