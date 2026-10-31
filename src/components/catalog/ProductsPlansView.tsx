import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Layers,
  Package,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BillingInterval, Plan, Product, ProductType, ProductVariant } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const ProductsPlansView: React.FC = () => {
  const { products, plans, addProduct, addPlan, currentUser } = useApp();

  const [activeSection, setActiveSection] = useState<'products' | 'plans'>('products');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  // New Product Form State
  const [newProductName, setNewProductName] = useState('');
  const [newProductType, setNewProductType] = useState<ProductType>('software');
  const [newSalesPrice, setNewSalesPrice] = useState<number>(500);
  const [newCostPrice, setNewCostPrice] = useState<number>(150);
  const [newNotes, setNewNotes] = useState('');
  const [newVariants, setNewVariants] = useState<Omit<ProductVariant, 'id'>[]>([
    {
      name: 'Odoo Edition',
      attribute: 'Brand Edition',
      value: 'Odoo',
      priceSurcharge: 560, // Prompt: "where choosing the Odoo brand adds 560 to the price"
    },
    {
      name: 'Standard Edition',
      attribute: 'Brand Edition',
      value: 'Standard Native',
      priceSurcharge: 0,
    },
  ]);

  // New Plan Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanCost, setNewPlanCost] = useState<number>(200);
  const [newPlanInterval, setNewPlanInterval] = useState<BillingInterval>('monthly');
  const [newMinQty, setNewMinQty] = useState<number>(1);
  const [newAvailFrom, setNewAvailFrom] = useState('2026-01-01');
  const [newAvailTo, setNewAvailTo] = useState('2028-12-31');
  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenew, setAllowRenew] = useState(true);

  const handleAddVariantRow = () => {
    setNewVariants([
      ...newVariants,
      {
        name: 'New Variant',
        attribute: 'Option',
        value: 'Standard',
        priceSurcharge: 0,
      },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    addProduct({
      name: newProductName,
      type: newProductType,
      salesPrice: Number(newSalesPrice),
      costPrice: Number(newCostPrice),
      notes: newNotes,
      taxRuleId: 'tax-2',
      variants: newVariants.map((v, i) => ({
        ...v,
        id: `var-custom-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    });

    setNewProductName('');
    setNewNotes('');
    setShowAddProductModal(false);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    addPlan({
      name: newPlanName,
      description: newPlanDesc,
      baseCost: Number(newPlanCost),
      billingInterval: newPlanInterval,
      minQuantity: Number(newMinQty),
      availableFrom: newAvailFrom,
      availableTo: newAvailTo,
      autoCloseOnEnd,
      allowEarlyClose,
      allowPause,
      allowRenew,
    });

    setNewPlanName('');
    setNewPlanDesc('');
    setShowAddPlanModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products, Variants & Billing Plans
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure software offerings, brand & edition variants (e.g. Odoo brand +$560), and recurring lifecycle rules.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
            <button
              onClick={() => setShowAddPlanModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Launch New Plan</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            Catalog configuration managed by Administrator
          </div>
        )}
      </div>

      {/* Segmented Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSection('products')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeSection === 'products'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products & Variants ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('plans')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeSection === 'plans'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Billing Plans & Lifecycle ({plans.length})</span>
        </button>
      </div>

      {/* Products Tab */}
      {activeSection === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((prod) => {
            const margin = prod.salesPrice - prod.costPrice;
            const marginPct = ((margin / prod.salesPrice) * 100).toFixed(0);

            return (
              <div
                key={prod.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                        {prod.type}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{prod.name}</h3>
                    </div>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatCurrency(prod.salesPrice)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{prod.notes}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>
                      <span>Cost: </span>
                      <span className="font-mono font-medium text-slate-700">
                        {formatCurrency(prod.costPrice)}
                      </span>
                    </div>
                    <div>
                      <span>Margin: </span>
                      <span className="font-mono font-semibold text-emerald-600">
                        {marginPct}% (+{formatCurrency(margin)})
                      </span>
                    </div>
                  </div>

                  {/* Variants Section */}
                  {prod.variants.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Available Variants & Surcharges
                      </span>
                      <div className="space-y-1">
                        {prod.variants.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded"
                          >
                            <span className="text-slate-800 font-medium">
                              {v.value} ({v.attribute})
                            </span>
                            <span className="font-mono text-indigo-600 font-semibold">
                              {v.priceSurcharge > 0 ? `+${formatCurrency(v.priceSurcharge)}` : 'Included'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plans Tab */}
      {activeSection === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {p.billingInterval} cadence
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{p.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-indigo-600">
                      {formatCurrency(p.baseCost)}
                    </span>
                    <span className="text-xs text-slate-400 block">/ {p.billingInterval}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2">{p.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Min Quantity
                    </span>
                    <span className="font-mono font-bold text-slate-800">{p.minQuantity} unit(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Availability Window
                    </span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      {p.availableFrom} to {p.availableTo}
                    </span>
                  </div>
                </div>

                {/* Lifecycle Rules Matrix (Scene 2 from PDF) */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Plan Lifecycle Policies
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                          p.autoCloseOnEnd
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.autoCloseOnEnd ? <Check className="w-2.5 h-2.5" /> : '—'}
                      </div>
                      <span className="text-slate-700">Auto-close on end</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                          p.allowEarlyClose
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.allowEarlyClose ? <Check className="w-2.5 h-2.5" /> : '—'}
                      </div>
                      <span className="text-slate-700">Allow early close</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                          p.allowPause
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.allowPause ? <Check className="w-2.5 h-2.5" /> : '—'}
                      </div>
                      <span className="text-slate-700">Allow customer pause</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                          p.allowRenew
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.allowRenew ? <Check className="w-2.5 h-2.5" /> : '—'}
                      </div>
                      <span className="text-slate-700">Allow contract renew</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Add New Product & Variants</h2>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g., Brightloop Analytics Pro"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  >
                    <option value="software">Software</option>
                    <option value="addon">Add-on</option>
                    <option value="service">Service</option>
                    <option value="physical">Physical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Price ($)</label>
                  <input
                    type="number"
                    value={newSalesPrice}
                    onChange={(e) => setNewSalesPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Product specs and notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              {/* Variants Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Product Variants (e.g. Brand edition +560)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs text-indigo-600 font-semibold hover:text-indigo-700"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {newVariants.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center text-xs">
                      <input
                        type="text"
                        placeholder="Variant Value (e.g. Odoo)"
                        value={v.value}
                        onChange={(e) => {
                          const updated = [...newVariants];
                          updated[i].value = e.target.value;
                          setNewVariants(updated);
                        }}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded p-1.5"
                      />
                      <input
                        type="number"
                        placeholder="Surcharge (e.g. 560)"
                        value={v.priceSurcharge}
                        onChange={(e) => {
                          const updated = [...newVariants];
                          updated[i].priceSurcharge = parseFloat(e.target.value) || 0;
                          setNewVariants(updated);
                        }}
                        className="w-24 bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantRow(i)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Launch New Billing Plan</h2>
              <button
                onClick={() => setShowAddPlanModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g., Growth Tier Annual"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interval</label>
                  <select
                    value={newPlanInterval}
                    onChange={(e) => setNewPlanInterval(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 capitalize"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Cost ($)</label>
                  <input
                    type="number"
                    value={newPlanCost}
                    onChange={(e) => setNewPlanCost(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newMinQty}
                    onChange={(e) => setNewMinQty(parseInt(e.target.value) || 1)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Lifecycle Options Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 block">
                  Plan Lifecycle Rules (Scene 2)
                </span>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCloseOnEnd}
                    onChange={(e) => setAutoCloseOnEnd(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Close automatically on end date</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowEarlyClose}
                    onChange={(e) => setAllowEarlyClose(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Can be closed early by customer or staff</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPause}
                    onChange={(e) => setAllowPause(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Can be paused temporarily</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRenew}
                    onChange={(e) => setAllowRenew(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Can be renewed upon contract expiration</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Launch Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
