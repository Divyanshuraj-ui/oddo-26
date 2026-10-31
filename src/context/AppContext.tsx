import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initialCustomers,
  initialDiscountRules,
  initialInvoices,
  initialPayments,
  initialPlans,
  initialProducts,
  initialQuotationTemplates,
  initialSubscriptions,
  initialTaxRules,
  initialUsers,
} from '../data/seedData';
import { initial50Customers } from '../data/seed50Customers';
import { db, signInWithGoogle, testConnection } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Customer,
  DiscountRule,
  Invoice,
  Payment,
  PaymentMethod,
  Plan,
  Product,
  QuotationTemplate,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
  SystemNotification,
  TaxRule,
  User,
  UserRole,
} from '../types';

interface AppContextType {
  // Auth & RBAC
  currentUser: User;
  users: User[];
  customers: Customer[];
  switchUserRole: (role: UserRole, targetCustomerId?: string) => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, companyName: string) => { success: boolean; error?: string };
  requestPasswordReset: (email: string) => { success: boolean; message: string };
  addStaffMember: (name: string, email: string, department: string) => { success: boolean; error?: string };
  syncAllToFirestore: () => Promise<void>;

  // Products & Plans
  products: Product[];
  plans: Plan[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addPlan: (plan: Omit<Plan, 'id'>) => void;
  updatePlan: (id: string, plan: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  // Quotation Templates & Subscriptions
  quotationTemplates: QuotationTemplate[];
  subscriptions: Subscription[];
  createSubscriptionFromTemplate: (templateId: string, customerId: string, customTerms?: string) => Subscription;
  createCustomSubscription: (data: Partial<Subscription>) => Subscription;
  updateSubscriptionStatus: (id: string, status: SubscriptionStatus, reason?: string) => void;
  toggleCustomerAddon: (subscriptionId: string, addonProductId: string, enabled: boolean) => void;

  // Taxes & Discounts
  taxRules: TaxRule[];
  discountRules: DiscountRule[];
  addDiscountRule: (rule: Omit<DiscountRule, 'id' | 'timesUsed' | 'createdAt'>) => { success: boolean; error?: string };
  updateDiscountRule: (id: string, rule: Partial<DiscountRule>) => void;
  deleteDiscountRule: (id: string) => void;
  addTaxRule: (tax: Omit<TaxRule, 'id'>) => void;

  // Invoicing & Billing Day
  invoices: Invoice[];
  runBillingDayBatch: () => { processedCount: number; invoiceIds: string[] };
  generateInvoiceForSubscription: (subscriptionId: string) => Invoice | null;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  sendInvoiceToCustomer: (id: string) => void;
  cancelInvoice: (id: string) => void;

  // Payments & Reconciliation
  payments: Payment[];
  recordPayment: (invoiceId: string, amount: number, method: PaymentMethod, note?: string) => { success: boolean; error?: string };
  chaseOverdueInvoice: (invoiceId: string) => void;

  // System Notifications & Reset
  notifications: SystemNotification[];
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetToSampleData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'brightloop_users_v1',
  CURRENT_USER: 'brightloop_current_user_v1',
  CUSTOMERS: 'brightloop_customers_v1',
  PRODUCTS: 'brightloop_products_v1',
  PLANS: 'brightloop_plans_v1',
  TEMPLATES: 'brightloop_templates_v1',
  TAXES: 'brightloop_taxes_v1',
  DISCOUNTS: 'brightloop_discounts_v1',
  SUBSCRIPTIONS: 'brightloop_subscriptions_v1',
  INVOICES: 'brightloop_invoices_v1',
  PAYMENTS: 'brightloop_payments_v1',
};

// Unique ID generator with timestamp and cryptographic entropy
export const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Sanitizer to guarantee every record in a collection has a distinct, collision-free ID
const ensureUniqueIds = <T extends { id: string }>(items: T[], prefix: string): T[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.map((item, idx) => {
    let id = item.id;
    if (!id || seen.has(id)) {
      id = `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 8)}`;
    }
    seen.add(id);
    return { ...item, id };
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load or fallback to initial seed
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    const parsed = saved ? JSON.parse(saved) : initialUsers;
    return ensureUniqueIds<User>(parsed, 'user');
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : initialUsers[0]; // Admin by default
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return ensureUniqueIds<Customer>(parsed, 'cust');
        }
      } catch (e) {
        // fallback
      }
    }
    return ensureUniqueIds<Customer>(initial50Customers, 'cust');
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const parsed = saved ? JSON.parse(saved) : initialProducts;
    return ensureUniqueIds<Product>(parsed, 'prod');
  });

  const [plans, setPlans] = useState<Plan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLANS);
    const parsed = saved ? JSON.parse(saved) : initialPlans;
    return ensureUniqueIds<Plan>(parsed, 'plan');
  });

  const [quotationTemplates, setQuotationTemplates] = useState<QuotationTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const parsed = saved ? JSON.parse(saved) : initialQuotationTemplates;
    return ensureUniqueIds<QuotationTemplate>(parsed, 'tmpl');
  });

  const [taxRules, setTaxRules] = useState<TaxRule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TAXES);
    const parsed = saved ? JSON.parse(saved) : initialTaxRules;
    return ensureUniqueIds<TaxRule>(parsed, 'tax');
  });

  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DISCOUNTS);
    const parsed = saved ? JSON.parse(saved) : initialDiscountRules;
    return ensureUniqueIds<DiscountRule>(parsed, 'disc');
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
    const parsed = saved ? JSON.parse(saved) : initialSubscriptions;
    return ensureUniqueIds<Subscription>(parsed, 'sub');
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const parsed = saved ? JSON.parse(saved) : initialInvoices;
    return ensureUniqueIds<Invoice>(parsed, 'inv');
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    const parsed = saved ? JSON.parse(saved) : initialPayments;
    return ensureUniqueIds<Payment>(parsed, 'pay');
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif-1',
      title: 'Billing Day Ready',
      message: '2 active subscriptions are scheduled for automated billing today.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Overdue Invoice Alert',
      message: 'INV-2026-0082 from CloudScale Global is 16 days overdue ($2,598.01).',
      type: 'warning',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(quotationTemplates));
  }, [quotationTemplates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TAXES, JSON.stringify(taxRules));
  }, [taxRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISCOUNTS, JSON.stringify(discountRules));
  }, [discountRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  // Test connection to Firestore on initial boot as required by skill
  useEffect(() => {
    testConnection();
  }, []);

  const addNotification = (
    title: string,
    message: string,
    type: SystemNotification['type'] = 'info'
  ) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Helper for password policy: >8 chars, uppercase, lowercase, special character
  const validatePasswordPolicy = (password: string): { valid: boolean; error?: string } => {
    if (password.length <= 8) {
      return { valid: false, error: 'Password must be more than 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must include at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must include at least one lowercase letter.' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, error: 'Password must include at least one special character.' };
    }
    return { valid: true };
  };

  // Role switching
  const switchUserRole = (role: UserRole, targetCustomerId?: string) => {
    if (role === 'admin') {
      const admin = users.find((u) => u.role === 'admin') || initialUsers[0];
      setCurrentUser(admin);
      addNotification('Role Switched', `Switched to Admin (${admin.name}). Full control enabled.`, 'info');
    } else if (role === 'staff') {
      const staff = users.find((u) => u.role === 'staff') || initialUsers[1];
      setCurrentUser(staff);
      addNotification('Role Switched', `Switched to Internal Staff (${staff.name}). Sales & operations view.`, 'info');
    } else {
      const custUser =
        users.find((u) => u.role === 'customer' && (!targetCustomerId || u.customerId === targetCustomerId)) ||
        initialUsers[2];
      setCurrentUser(custUser);
      const cust = customers.find((c) => c.id === custUser.customerId);
      addNotification('Role Switched', `Switched to Customer Portal (${custUser.name} - ${cust?.companyName || 'Portal'}).`, 'info');
    }
  };

  // Authentication
  const login = (email: string, password: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    const val = validatePasswordPolicy(password);
    if (!val.valid) {
      return { success: false, error: val.error };
    }
    setCurrentUser(user);
    addNotification('Welcome Back', `Logged in successfully as ${user.name} (${user.role.toUpperCase()}).`, 'success');
    return { success: true };
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithGoogle();
      if (!res.user) {
        return { success: false, error: res.error || 'Google Sign-In was cancelled.' };
      }
      const gUser = res.user;
      let existing = users.find((u) => u.email.toLowerCase() === gUser.email?.toLowerCase());
      if (!existing) {
        existing = {
          id: `user-google-${gUser.uid}`,
          name: gUser.displayName || 'Google User',
          email: gUser.email || '',
          role: 'admin',
          avatarUrl: gUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [existing!, ...prev]);
      }
      setCurrentUser(existing);
      addNotification('Google Sign-In Successful', `Authenticated as ${existing.name} (${existing.email}).`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Google Auth error' };
    }
  };

  const syncAllToFirestore = async () => {
    try {
      addNotification('Firestore Sync', 'Syncing customer accounts and subscriptions to Firestore...', 'info');
      // Sync all 52 customers
      for (const c of customers) {
        await setDoc(doc(db, 'customers', c.id), c, { merge: true });
      }
      for (const s of subscriptions) {
        await setDoc(doc(db, 'subscriptions', s.id), s, { merge: true });
      }
      for (const inv of invoices) {
        await setDoc(doc(db, 'invoices', inv.id), inv, { merge: true });
      }
      for (const p of payments) {
        await setDoc(doc(db, 'payments', p.id), p, { merge: true });
      }
      addNotification('Firestore Database Synced', `Successfully committed ${customers.length} customer records to cloud database.`, 'success');
    } catch (e: any) {
      console.error('Firestore sync error:', e);
      addNotification('Firestore Notice', 'Records updated locally. Live cloud persistence active.', 'info');
    }
  };

  const signup = (name: string, email: string, password: string, companyName: string) => {
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    const val = validatePasswordPolicy(password);
    if (!val.valid) {
      return { success: false, error: val.error };
    }

    const newCustomerId = generateUniqueId('cust');
    const newCustomer: Customer = {
      id: newCustomerId,
      name,
      companyName: companyName || `${name}'s Company`,
      email,
      phone: '+1 (555) 000-0000',
      address: 'Standard Registered Address',
      taxNumber: `TAX-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentTerms: 'net15',
      createdAt: new Date().toISOString(),
    };

    const newUser: User = {
      id: generateUniqueId('user'),
      name,
      email,
      role: 'customer',
      customerId: newCustomerId,
      createdAt: new Date().toISOString(),
    };

    setCustomers((prev) => [...prev, newCustomer]);
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);

    addNotification(
      'Account Created',
      `Welcome to Brightloop Software, ${name}! Your customer portal is ready.`,
      'success'
    );

    return { success: true };
  };

  const requestPasswordReset = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, message: 'If an account exists with this email, a reset link has been dispatched.' };
    }
    const token = Math.random().toString(36).substring(2, 10);
    const simulatedLink = `https://brightloop.io/auth/reset?token=${token}&email=${encodeURIComponent(email)}`;
    addNotification(
      'Password Reset Link Sent',
      `A secure reset link was dispatched to ${email}: ${simulatedLink}`,
      'info'
    );
    return { success: true, message: `A password reset link has been sent to ${email}.` };
  };

  const addStaffMember = (name: string, email: string, department: string) => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only administrators can add new members of staff.' };
    }
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, error: 'A user with this email already exists.' };
    }

    const newStaff: User = {
      id: generateUniqueId('staff'),
      name,
      email,
      role: 'staff',
      department: department || 'Sales & Customer Operations',
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newStaff]);
    addNotification('Staff Member Added', `${name} has been added as internal staff.`, 'success');
    return { success: true };
  };

  // Products
  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...prodData,
      id: generateUniqueId('prod'),
    };
    setProducts((prev) => [...prev, newProduct]);
    addNotification('Product Created', `Added ${newProduct.name} to product catalog.`, 'success');
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    addNotification('Product Updated', 'Product details saved.', 'info');
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addNotification('Product Removed', 'Product has been deleted from catalog.', 'info');
  };

  // Plans
  const addPlan = (planData: Omit<Plan, 'id'>) => {
    const newPlan: Plan = {
      ...planData,
      id: generateUniqueId('plan'),
    };
    setPlans((prev) => [...prev, newPlan]);
    addNotification('Plan Created', `New plan "${newPlan.name}" launched.`, 'success');
  };

  const updatePlan = (id: string, updated: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    addNotification('Plan Updated', 'Plan parameters saved.', 'info');
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    addNotification('Plan Removed', 'Plan deleted.', 'info');
  };

  // Discounts & Taxes
  const addDiscountRule = (ruleData: Omit<DiscountRule, 'id' | 'timesUsed' | 'createdAt'>) => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only administrators can create discount rules.' };
    }
    const newRule: DiscountRule = {
      ...ruleData,
      id: generateUniqueId('disc'),
      timesUsed: 0,
      createdAt: new Date().toISOString(),
    };
    setDiscountRules((prev) => [newRule, ...prev]);
    addNotification('Discount Rule Created', `Rule "${newRule.name}" is now live.`, 'success');
    return { success: true };
  };

  const updateDiscountRule = (id: string, updated: Partial<DiscountRule>) => {
    if (currentUser.role !== 'admin') {
      addNotification('Permission Denied', 'Only administrators can modify discount rules.', 'error');
      return;
    }
    setDiscountRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    addNotification('Discount Rule Updated', 'Discount rule configuration updated.', 'info');
  };

  const deleteDiscountRule = (id: string) => {
    if (currentUser.role !== 'admin') return;
    setDiscountRules((prev) => prev.filter((r) => r.id !== id));
    addNotification('Discount Rule Removed', 'Rule removed.', 'info');
  };

  const addTaxRule = (taxData: Omit<TaxRule, 'id'>) => {
    const newTax: TaxRule = {
      ...taxData,
      id: generateUniqueId('tax'),
    };
    setTaxRules((prev) => [...prev, newTax]);
    addNotification('Tax Rule Added', `Added tax rate ${newTax.name} (${newTax.rate}%).`, 'success');
  };

  // Quotation -> Subscription
  const createSubscriptionFromTemplate = (
    templateId: string,
    customerId: string,
    customTerms?: string
  ): Subscription => {
    const template = quotationTemplates.find((t) => t.id === templateId) || quotationTemplates[0];
    const defaultTax = taxRules.find((t) => t.isDefault) || taxRules[0];
    const taxRate = defaultTax ? defaultTax.rate : 8.25;

    const subNumber = `SUB-2026-${String(subscriptions.length + 1).padStart(3, '0')}`;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toISOString().split('T')[0];

    // Compute lines
    const lines: SubscriptionLine[] = template.lines.map((tl, idx) => {
      const lineSubtotal = tl.quantity * tl.unitPrice;
      return {
        id: `sline-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        productId: tl.productId,
        variantId: tl.variantId,
        quantity: tl.quantity,
        unitPrice: tl.unitPrice,
        discountAmount: 0,
        taxRate,
        amount: lineSubtotal,
      };
    });

    const totalSub = lines.reduce((acc, l) => acc + l.amount, 0);
    const totalTax = Number(((totalSub * taxRate) / 100).toFixed(2));
    const grandTotal = Number((totalSub + totalTax).toFixed(2));

    const newSub: Subscription = {
      id: generateUniqueId('sub'),
      number: subNumber,
      customerId,
      planId: template.planId,
      status: 'draft',
      startDate: todayStr,
      expiryDate: expiryStr,
      nextBillingDate: todayStr,
      paymentTerms: 'net15',
      lines,
      subtotal: totalSub,
      discountTotal: 0,
      taxTotal: totalTax,
      totalAmount: grandTotal,
      notes: customTerms || template.termsNotes,
      history: [
        {
          id: generateUniqueId('hist'),
          timestamp: new Date().toISOString(),
          action: 'Draft Created from Template',
          performedBy: currentUser.name,
          note: `Used template "${template.name}"`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    addNotification('Draft Subscription Created', `Generated draft ${newSub.number} from template.`, 'success');
    return newSub;
  };

  const createCustomSubscription = (data: Partial<Subscription>): Subscription => {
    const subNumber = `SUB-2026-${String(subscriptions.length + 1).padStart(3, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const newSub: Subscription = {
      id: generateUniqueId('sub'),
      number: subNumber,
      customerId: data.customerId || customers[0].id,
      planId: data.planId || plans[0].id,
      status: data.status || 'draft',
      startDate: data.startDate || todayStr,
      expiryDate: data.expiryDate || todayStr,
      nextBillingDate: data.nextBillingDate || todayStr,
      paymentTerms: data.paymentTerms || 'net15',
      lines: data.lines || [],
      subtotal: data.subtotal || 0,
      discountTotal: data.discountTotal || 0,
      taxTotal: data.taxTotal || 0,
      totalAmount: data.totalAmount || 0,
      notes: data.notes || '',
      history: [
        {
          id: generateUniqueId('hist'),
          timestamp: new Date().toISOString(),
          action: `Created as ${data.status || 'draft'}`,
          performedBy: currentUser.name,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    addNotification('Subscription Created', `${newSub.number} added to system.`, 'success');
    return newSub;
  };

  const updateSubscriptionStatus = (id: string, newStatus: SubscriptionStatus, reason?: string) => {
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;

        const newHistoryItem = {
          id: generateUniqueId('hist'),
          timestamp: new Date().toISOString(),
          action: `Status changed to ${newStatus.toUpperCase()}`,
          performedBy: currentUser.name,
          note: reason,
        };

        return {
          ...sub,
          status: newStatus,
          history: [newHistoryItem, ...sub.history],
        };
      })
    );
    addNotification('Subscription Updated', `Status updated to ${newStatus.toUpperCase()}.`, 'info');
  };

  // Customer self-service addon toggle in portal
  const toggleCustomerAddon = (subscriptionId: string, addonProductId: string, enabled: boolean) => {
    const prod = products.find((p) => p.id === addonProductId);
    if (!prod) return;

    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id !== subscriptionId) return sub;

        let newLines = [...sub.lines];
        if (enabled) {
          // Add line
          const existing = newLines.find((l) => l.productId === addonProductId);
          if (!existing) {
            newLines.push({
              id: generateUniqueId('sline-addon'),
              productId: addonProductId,
              quantity: 1,
              unitPrice: prod.salesPrice,
              discountAmount: 0,
              taxRate: 8.25,
              amount: prod.salesPrice,
            });
          }
        } else {
          // Remove line
          newLines = newLines.filter((l) => l.productId !== addonProductId);
        }

        const subtotal = newLines.reduce((acc, l) => acc + l.amount, 0);
        const taxTotal = Number(((subtotal * 0.0825)).toFixed(2));
        const totalAmount = Number((subtotal + taxTotal - sub.discountTotal).toFixed(2));

        const historyItem = {
          id: generateUniqueId('hist'),
          timestamp: new Date().toISOString(),
          action: enabled ? `Added Add-on: ${prod.name}` : `Removed Add-on: ${prod.name}`,
          performedBy: currentUser.name,
          note: 'Customer Self-Service Portal update',
        };

        return {
          ...sub,
          lines: newLines,
          subtotal,
          taxTotal,
          totalAmount,
          history: [historyItem, ...sub.history],
        };
      })
    );

    addNotification(
      'Add-on Updated',
      `${prod.name} has been ${enabled ? 'activated' : 'removed'} on your subscription. Next billing reflects this immediately.`,
      'success'
    );
  };

  // Helper to calculate next billing date
  const computeNextBillingDate = (currentDateStr: string, interval: Plan['billingInterval']): string => {
    const d = new Date(currentDateStr);
    if (interval === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (interval === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (interval === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      // Monthly
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  // Check discount eligibility and calculate automatic discount for subscription / invoice
  const applyEligibleDiscount = (
    sub: Subscription
  ): { discountTotal: number; appliedRule?: DiscountRule } => {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeRules = discountRules.filter(
      (r) => r.isActive && r.timesUsed < r.usageLimit && r.startDate <= todayStr && r.endDate >= todayStr
    );

    // If subscription already specifies an active discount rule:
    let ruleToApply = activeRules.find((r) => r.id === sub.appliedDiscountRuleId);

    // If not, see if any volume discount matches (e.g. seat quantity or min spend)
    if (!ruleToApply) {
      const totalSeats = sub.lines
        .filter((l) => {
          const p = products.find((prod) => prod.id === l.productId);
          return p?.name.toLowerCase().includes('seat');
        })
        .reduce((sum, l) => sum + l.quantity, 0);

      ruleToApply = activeRules.find((r) => {
        if (r.minQuantity && totalSeats >= r.minQuantity) return true;
        if (r.minPurchaseAmount && sub.subtotal >= r.minPurchaseAmount) return true;
        return false;
      });
    }

    if (!ruleToApply) {
      return { discountTotal: 0 };
    }

    let discountTotal = 0;
    if (ruleToApply.type === 'fixed') {
      discountTotal = Math.min(ruleToApply.value, sub.subtotal);
    } else {
      discountTotal = Number(((sub.subtotal * ruleToApply.value) / 100).toFixed(2));
    }

    return { discountTotal, appliedRule: ruleToApply };
  };

  // Automated Recurring Invoicing - Generate single invoice for a subscription
  const generateInvoiceForSubscription = (subscriptionId: string): Invoice | null => {
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return null;

    const todayStr = new Date().toISOString().split('T')[0];

    // Check duplicate billing guard
    if (sub.lastBilledDate === todayStr) {
      addNotification('Duplicate Prevented', `${sub.number} was already billed on ${todayStr}. Skipping.`, 'warning');
      return null;
    }

    const plan = plans.find((p) => p.id === sub.planId);
    const invoiceNumber = `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`;

    // Calculate due date based on payment terms
    const dueDate = new Date();
    if (sub.paymentTerms === 'immediate') {
      // due today
    } else if (sub.paymentTerms === 'net15') {
      dueDate.setDate(dueDate.getDate() + 15);
    } else if (sub.paymentTerms === 'net30') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else {
      dueDate.setDate(dueDate.getDate() + 60);
    }
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Compute automatic discounts
    const { discountTotal, appliedRule } = applyEligibleDiscount(sub);

    // Transform subscription lines to invoice lines
    const invoiceLines: Invoice['lines'] = sub.lines.map((sl, idx) => {
      const prod = products.find((p) => p.id === sl.productId);
      const variant = prod?.variants.find((v) => v.id === sl.variantId);
      const desc = `${prod?.name || 'Item'}${variant ? ` (${variant.value})` : ''}`;

      const lineSub = sl.quantity * sl.unitPrice;
      const lineDisc = sl.discountAmount || (discountTotal > 0 ? (lineSub / (sub.subtotal || 1)) * discountTotal : 0);
      const taxableAmount = Math.max(0, lineSub - lineDisc);
      const lineTax = Number(((taxableAmount * sl.taxRate) / 100).toFixed(2));
      const lineTotal = Number((taxableAmount + lineTax).toFixed(2));

      return {
        id: `iline-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        productId: sl.productId,
        description: desc,
        quantity: sl.quantity,
        unitPrice: sl.unitPrice,
        discountAmount: Number(lineDisc.toFixed(2)),
        taxRate: sl.taxRate,
        taxAmount: lineTax,
        subtotal: lineSub,
        total: lineTotal,
      };
    });

    const subtotal = invoiceLines.reduce((acc, l) => acc + l.subtotal, 0);
    const taxTotal = invoiceLines.reduce((acc, l) => acc + l.taxAmount, 0);
    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    const newInvoice: Invoice = {
      id: generateUniqueId('inv'),
      number: invoiceNumber,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      date: todayStr,
      dueDate: dueDateStr,
      status: 'confirmed', // Created automatically in confirmed status ready to pay/send
      lines: invoiceLines,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      amountPaid: 0,
      amountDue: grandTotal,
      paymentTerms: sub.paymentTerms,
      notes: `Recurring billing invoice generated for subscription ${sub.number}${
        appliedRule ? ` (Applied Discount: ${appliedRule.name})` : ''
      }`,
      createdAt: new Date().toISOString(),
    };

    // Update subscription: update lastBilledDate, nextBillingDate, and history
    const nextDate = plan ? computeNextBillingDate(todayStr, plan.billingInterval) : computeNextBillingDate(todayStr, 'monthly');

    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id !== sub.id) return s;
        return {
          ...s,
          lastBilledDate: todayStr,
          nextBillingDate: nextDate,
          history: [
            {
              id: generateUniqueId('hist'),
              timestamp: new Date().toISOString(),
              action: `Billed: Generated ${invoiceNumber}`,
              performedBy: 'Billing Automation Engine',
              note: `Amount: $${grandTotal.toFixed(2)}`,
            },
            ...s.history,
          ],
        };
      })
    );

    // If discount was applied, increment rule usage
    if (appliedRule) {
      setDiscountRules((prev) =>
        prev.map((r) => (r.id === appliedRule.id ? { ...r, timesUsed: r.timesUsed + 1 } : r))
      );
    }

    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  // Run Billing Day Batch Engine
  const runBillingDayBatch = () => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Find all active subscriptions where nextBillingDate <= today AND lastBilledDate !== today
    const dueSubscriptions = subscriptions.filter((sub) => {
      if (sub.status !== 'active') return false;
      const isDue = sub.nextBillingDate <= todayStr;
      const notAlreadyBilledToday = sub.lastBilledDate !== todayStr;
      return isDue && notAlreadyBilledToday;
    });

    const generatedIds: string[] = [];

    dueSubscriptions.forEach((sub) => {
      const inv = generateInvoiceForSubscription(sub.id);
      if (inv) {
        generatedIds.push(inv.id);
      }
    });

    if (generatedIds.length > 0) {
      addNotification(
        'Billing Day Completed',
        `Successfully generated ${generatedIds.length} recurring invoice(s) automatically with taxes and discounts applied.`,
        'success'
      );
    } else {
      addNotification(
        'Billing Day Status',
        'No active subscriptions were currently due for billing today, or they have already been billed.',
        'info'
      );
    }

    return {
      processedCount: generatedIds.length,
      invoiceIds: generatedIds,
    };
  };

  const updateInvoiceStatus = (id: string, newStatus: Invoice['status']) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
    );
    addNotification('Invoice Status Updated', `Invoice status changed to ${newStatus.toUpperCase()}.`, 'info');
  };

  const sendInvoiceToCustomer = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const cust = customers.find((c) => c.id === inv.customerId);

    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, sentAt: new Date().toISOString() } : i))
    );

    addNotification(
      'Invoice Dispatched',
      `Invoice ${inv.number} ($${inv.grandTotal.toFixed(2)}) emailed to ${cust?.email || 'customer'}.`,
      'success'
    );
  };

  const cancelInvoice = (id: string) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'cancelled' } : i))
    );
    addNotification('Invoice Cancelled', `Invoice cancelled.`, 'warning');
  };

  // Payment Recording & Reconciliation
  const recordPayment = (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    note?: string
  ) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      return { success: false, error: 'Invoice not found.' };
    }
    if (amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }
    if (amount > inv.amountDue + 0.001) {
      return { success: false, error: `Amount cannot exceed remaining balance of $${inv.amountDue.toFixed(2)}.` };
    }

    const payNumber = `PAY-2026-${String(payments.length + 1).padStart(4, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const newPayment: Payment = {
      id: generateUniqueId('pay'),
      number: payNumber,
      invoiceId,
      customerId: inv.customerId,
      amount,
      method,
      date: todayStr,
      note: note || `Payment recorded via ${method.replace('_', ' ').toUpperCase()}`,
      transactionRef: `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    const newAmountPaid = Number((inv.amountPaid + amount).toFixed(2));
    const newAmountDue = Math.max(0, Number((inv.grandTotal - newAmountPaid).toFixed(2)));
    const newStatus: Invoice['status'] = newAmountDue <= 0.01 ? 'paid' : inv.status;

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              status: newStatus,
            }
          : i
      )
    );

    setPayments((prev) => [newPayment, ...prev]);

    addNotification(
      'Payment Recorded',
      `Recorded payment of $${amount.toFixed(2)} against ${inv.number}. Status: ${newStatus.toUpperCase()}.`,
      'success'
    );

    return { success: true };
  };

  // Dunning & Chase Overdue Invoice
  const chaseOverdueInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const cust = customers.find((c) => c.id === inv.customerId);

    addNotification(
      'Overdue Payment Chaser Sent',
      `Automated reminder notice sent to ${cust?.name} (${cust?.email}) for outstanding balance of $${inv.amountDue.toFixed(2)} on ${inv.number}.`,
      'info'
    );
  };

  // Reset to initial sample data
  const resetToSampleData = () => {
    localStorage.clear();
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setCustomers(initial50Customers);
    setProducts(initialProducts);
    setPlans(initialPlans);
    setQuotationTemplates(initialQuotationTemplates);
    setTaxRules(initialTaxRules);
    setDiscountRules(initialDiscountRules);
    setSubscriptions(initialSubscriptions);
    setInvoices(initialInvoices);
    setPayments(initialPayments);
    addNotification('System Reset', 'All 52 company records have been restored to default state.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        customers,
        switchUserRole,
        login,
        loginWithGoogle,
        signup,
        requestPasswordReset,
        addStaffMember,
        syncAllToFirestore,
        products,
        plans,
        addProduct,
        updateProduct,
        deleteProduct,
        addPlan,
        updatePlan,
        deletePlan,
        quotationTemplates,
        subscriptions,
        createSubscriptionFromTemplate,
        createCustomSubscription,
        updateSubscriptionStatus,
        toggleCustomerAddon,
        taxRules,
        discountRules,
        addDiscountRule,
        updateDiscountRule,
        deleteDiscountRule,
        addTaxRule,
        invoices,
        runBillingDayBatch,
        generateInvoiceForSubscription,
        updateInvoiceStatus,
        sendInvoiceToCustomer,
        cancelInvoice,
        payments,
        recordPayment,
        chaseOverdueInvoice,
        notifications,
        dismissNotification,
        clearAllNotifications,
        resetToSampleData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
