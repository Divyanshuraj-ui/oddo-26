import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { GeminiChatbotDrawer } from './components/ai/GeminiChatbotDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { BillingDayView } from './components/billing/BillingDayView';
import { InvoiceDetailModal } from './components/billing/InvoiceDetailModal';
import { ProductsPlansView } from './components/catalog/ProductsPlansView';
import { FinanceDashboard } from './components/dashboard/FinanceDashboard';
import { DiscountsTaxesView } from './components/discounts/DiscountsTaxesView';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PaymentsView } from './components/payments/PaymentsView';
import { RecordPaymentModal } from './components/payments/RecordPaymentModal';
import { CustomerPortalView } from './components/portal/CustomerPortalView';
import { CreateSubscriptionModal } from './components/subscriptions/CreateSubscriptionModal';
import { SubscriptionDetailModal } from './components/subscriptions/SubscriptionDetailModal';
import { SubscriptionsList } from './components/subscriptions/SubscriptionsList';
import { UsersCustomersView } from './components/users/UsersCustomersView';
import { AppProvider, useApp } from './context/AppContext';

function MainApp() {
  const { subscriptions, invoices, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showNewQuoteModal, setShowNewQuoteModal] = useState<boolean>(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<boolean>(false);
  const [paymentPreselectedInvoiceId, setPaymentPreselectedInvoiceId] = useState<string | undefined>(
    undefined
  );
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [aiDrawerInitialQuery, setAiDrawerInitialQuery] = useState<string>('');
  const [aiDrawerInitialMode, setAiDrawerInitialMode] = useState<'chat' | 'maps'>('chat');

  // If user switches to customer role, default to portal view
  React.useEffect(() => {
    if (currentUser.role === 'customer' && activeTab !== 'portal' && activeTab !== 'portal-invoices') {
      setActiveTab('portal');
    }
  }, [currentUser.role]);

  const selectedSubscription = subscriptions.find((s) => s.id === selectedSubscriptionId) || null;
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || null;

  const handleOpenRecordPayment = (invoiceId?: string) => {
    setPaymentPreselectedInvoiceId(invoiceId);
    setShowRecordPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAiCopilot={() => {
          setAiDrawerInitialQuery('');
          setAiDrawerInitialMode('chat');
          setShowAiDrawer(true);
        }}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenNewQuote={() => setShowNewQuoteModal(true)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <FinanceDashboard
              onSelectSubscription={(id) => setSelectedSubscriptionId(id)}
              onSelectInvoice={(id) => setSelectedInvoiceId(id)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsList
              onSelectSubscription={(id) => setSelectedSubscriptionId(id)}
              onOpenCreate={() => setShowNewQuoteModal(true)}
              defaultFilter="all"
            />
          )}

          {activeTab === 'quotes' && (
            <SubscriptionsList
              onSelectSubscription={(id) => setSelectedSubscriptionId(id)}
              onOpenCreate={() => setShowNewQuoteModal(true)}
              defaultFilter="quotation"
            />
          )}

          {activeTab === 'billing' && (
            <BillingDayView
              onSelectInvoice={(id) => setSelectedInvoiceId(id)}
              onRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'invoices' && (
            <BillingDayView
              onSelectInvoice={(id) => setSelectedInvoiceId(id)}
              onRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              onOpenRecordPayment={handleOpenRecordPayment}
              onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            />
          )}

          {activeTab === 'catalog' && <ProductsPlansView />}

          {activeTab === 'discounts' && <DiscountsTaxesView />}

          {activeTab === 'customers' && (
            <UsersCustomersView
              onTriggerMapsQuery={(address, company) => {
                setAiDrawerInitialQuery(`Find office branches, corporate presence and tech hubs near ${company} at ${address}`);
                setAiDrawerInitialMode('maps');
                setShowAiDrawer(true);
              }}
            />
          )}

          {(activeTab === 'portal' || activeTab === 'portal-invoices') && (
            <CustomerPortalView
              onOpenInvoice={(id) => setSelectedInvoiceId(id)}
              onPayInvoice={handleOpenRecordPayment}
            />
          )}
        </main>
      </div>

      {/* Floating AI Copilot Launcher */}
      <button
        onClick={() => {
          setAiDrawerInitialQuery('');
          setAiDrawerInitialMode('chat');
          setShowAiDrawer(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl border border-slate-700/80 transition-all hover:scale-105 active:scale-95 group"
        title="Open Gemini AI Subscription Copilot & Google Maps Intelligence"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide">Gemini Copilot</span>
      </button>

      {/* Modals & Drawers */}
      <GeminiChatbotDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        initialQuery={aiDrawerInitialQuery}
        initialMode={aiDrawerInitialMode}
      />

      <CreateSubscriptionModal
        isOpen={showNewQuoteModal}
        onClose={() => setShowNewQuoteModal(false)}
        onCreated={(id) => setSelectedSubscriptionId(id)}
      />

      <SubscriptionDetailModal
        subscription={selectedSubscription}
        onClose={() => setSelectedSubscriptionId(null)}
        onOpenInvoice={(invId) => {
          setSelectedSubscriptionId(null);
          setSelectedInvoiceId(invId);
        }}
      />

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoiceId(null)}
        onRecordPayment={(invId) => {
          setSelectedInvoiceId(null);
          handleOpenRecordPayment(invId);
        }}
      />

      <RecordPaymentModal
        isOpen={showRecordPaymentModal}
        onClose={() => {
          setShowRecordPaymentModal(false);
          setPaymentPreselectedInvoiceId(undefined);
        }}
        preselectedInvoiceId={paymentPreselectedInvoiceId}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
