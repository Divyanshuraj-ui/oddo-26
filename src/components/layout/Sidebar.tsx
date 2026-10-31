import React from 'react';
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  Layers,
  Package,
  Percent,
  PlayCircle,
  Receipt,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewQuote: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenNewQuote }) => {
  const { currentUser, subscriptions, invoices, runBillingDayBatch } = useApp();

  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;
  const quoteCount = subscriptions.filter((s) => s.status === 'quotation' || s.status === 'draft').length;
  const overdueInvoicesCount = invoices.filter((i) => i.status === 'overdue').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const billingDueCount = subscriptions.filter(
    (s) => s.status === 'active' && s.nextBillingDate <= todayStr && s.lastBilledDate !== todayStr
  ).length;

  const isCustomer = currentUser.role === 'customer';
  const isAdmin = currentUser.role === 'admin';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Top CTA */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        {!isCustomer ? (
          <>
            <button
              onClick={onOpenNewQuote}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all active:scale-[0.98]"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Create Quote / Subscription</span>
            </button>

            {billingDueCount > 0 && (
              <button
                onClick={() => {
                  runBillingDayBatch();
                  setActiveTab('billing');
                }}
                className="w-full flex items-center justify-between py-1.5 px-2.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Run Billing Day</span>
                </span>
                <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-100 px-1.5 py-0.2 rounded">
                  {billingDueCount} due
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="p-2.5 bg-slate-800/80 rounded-lg text-xs text-slate-300">
            <p className="font-semibold text-white">Customer Account</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Manage your plans, add-ons and receipts directly.</p>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {!isCustomer ? (
          <>
            <div>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Executive & Operations
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>Finance Dashboard</span>
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'subscriptions'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4" />
                    <span>Subscriptions</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {activeSubsCount} active
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'quotes'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileCheck2 className="w-4 h-4" />
                    <span>Quotation Pipeline</span>
                  </span>
                  {quoteCount > 0 && (
                    <span className="text-[11px] font-mono text-indigo-300 tabular-nums">
                      {quoteCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Recurring Billing & Ledger
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'billing'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarCheck className="w-4 h-4" />
                    <span>Billing Day Automation</span>
                  </span>
                  {billingDueCount > 0 && (
                    <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                      {billingDueCount} due
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'invoices'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4" />
                    <span>Invoices</span>
                  </span>
                  {overdueInvoicesCount > 0 && (
                    <span className="text-[11px] font-mono text-rose-400 tabular-nums flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {overdueInvoicesCount} overdue
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('payments')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'payments'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Payments & Reconciliation</span>
                  </span>
                </button>
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Configuration & Catalog
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'catalog'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Package className="w-4 h-4" />
                    <span>Products, Variants & Plans</span>
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('discounts')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'discounts'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Percent className="w-4 h-4" />
                    <span>Discount Rules & Taxes</span>
                  </span>
                  {!isAdmin && (
                    <span className="text-[10px] text-slate-500 font-mono">Admin Only</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'customers'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>Customers & Staff</span>
                  </span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Customer Self-Service
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveTab('portal')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'portal'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4" />
                  <span>My Subscriptions & Add-ons</span>
                </span>
              </button>

              <button
                onClick={() => setActiveTab('portal-invoices')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'portal-invoices'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4" />
                  <span>Invoices & Receipts</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Role Footer Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Current Session</span>
          <span className="font-mono text-indigo-400 capitalize">{currentUser.role}</span>
        </div>
        <p className="font-medium text-slate-200 mt-1 truncate">{currentUser.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
      </div>
    </aside>
  );
};
