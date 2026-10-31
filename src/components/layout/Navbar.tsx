import React, { useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, RotateCcw, Shield, Sparkles, User, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../../utils/formatters';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenAiCopilot: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth, onOpenAiCopilot }) => {
  const {
    currentUser,
    switchUserRole,
    notifications,
    dismissNotification,
    clearAllNotifications,
    resetToSampleData,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-left font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                B
              </span>
              <span className="whitespace-nowrap">Brightloop</span>
            </button>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline whitespace-nowrap">
              Subscription Management
            </span>
          </div>

          {/* Zone 2: Concise primary navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'subscriptions' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'billing' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              Billing Day
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'catalog' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              Products & Plans
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'portal' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              Customer Portal
            </button>
          </nav>

          {/* Zone 3: Quick Role Switcher & System Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="System Notifications"
                aria-label="System Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900 tracking-wide">
                      Activity & Alerts ({notifications.length})
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications currently.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5 items-start">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              notif.type === 'error'
                                ? 'bg-red-500'
                                : notif.type === 'warning'
                                ? 'bg-amber-500'
                                : notif.type === 'success'
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-900 leading-snug">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {formatDateTime(notif.timestamp)}
                            </span>
                          </div>
                          <button
                            onClick={() => dismissNotification(notif.id)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Pill & Account */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-medium text-slate-700 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span className="capitalize font-semibold text-slate-900">{currentUser.role}</span>
                <span className="text-slate-400">·</span>
                <span className="truncate max-w-[100px] text-slate-600">{currentUser.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">Switch Hackathon Role</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Verify permissions, views, and workflows across personas:
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        switchUserRole('admin');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Admin (Alex Morgan)</div>
                        <div className="text-[11px] text-slate-500">Full control, add staff, create discounts & taxes</div>
                      </div>
                      {currentUser.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </button>

                    <button
                      onClick={() => {
                        switchUserRole('staff');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Internal Staff (Elena Rostova)</div>
                        <div className="text-[11px] text-slate-500">Sales, quotes, recurring billing, payments</div>
                      </div>
                      {currentUser.role === 'staff' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </button>

                    <button
                      onClick={() => {
                        switchUserRole('customer', 'cust-1');
                        setActiveTab('portal');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Customer (David Chen @ Apex)</div>
                        <div className="text-[11px] text-slate-500">Self-service portal, manage add-ons & pay bills</div>
                      </div>
                      {currentUser.role === 'customer' && currentUser.customerId === 'cust-1' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        switchUserRole('customer', 'cust-2');
                        setActiveTab('portal');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Enterprise Customer (Sophia Vance)</div>
                        <div className="text-[11px] text-slate-500">CloudScale Global enterprise account</div>
                      </div>
                      {currentUser.role === 'customer' && currentUser.customerId === 'cust-2' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1 px-2">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onOpenAuth();
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1.5 font-medium"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In / Register New Account</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        resetToSampleData();
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Factory Sample Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Copilot Button */}
            <button
              onClick={onOpenAiCopilot}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-lg transition-all shadow-2xs group"
              title="Open Gemini AI Intelligence Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>AI Copilot</span>
            </button>

            {/* Quick Action Button */}
            <button
              onClick={() => setActiveTab('subscriptions')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
            >
              Manage Plans
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
