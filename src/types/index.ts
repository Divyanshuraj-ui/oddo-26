export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  customerId?: string; // Links customer role to specific customer account
  department?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  paymentTerms: 'immediate' | 'net15' | 'net30' | 'net60';
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  attribute: string; // e.g. "Brand", "Tier", "Storage"
  value: string; // e.g. "Odoo", "Brightloop Native", "SAP Enterprise"
  priceSurcharge: number; // e.g. +560 for Odoo brand
}

export type ProductType = 'software' | 'addon' | 'service' | 'physical';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes: string;
  variants: ProductVariant[];
  taxRuleId: string;
  isAddon?: boolean;
}

export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  billingInterval: BillingInterval;
  minQuantity: number;
  availableFrom: string;
  availableTo: string;
  // Lifecycle rules per plan
  autoCloseOnEnd: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
}

export interface QuotationTemplateLine {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
  planId: string;
  validityDays: number;
  lines: QuotationTemplateLine[];
  termsNotes: string;
}

export type SubscriptionStatus =
  | 'draft'
  | 'quotation'
  | 'confirmed'
  | 'active'
  | 'paused'
  | 'closed';

export interface SubscriptionLine {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  amount: number;
}

export interface SubscriptionHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  note?: string;
}

export interface Subscription {
  id: string;
  number: string; // e.g., SUB-2026-001
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  nextBillingDate: string;
  lastBilledDate?: string;
  paymentTerms: 'immediate' | 'net15' | 'net30' | 'net60';
  lines: SubscriptionLine[];
  appliedDiscountRuleId?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  notes?: string;
  history: SubscriptionHistoryItem[];
  createdAt: string;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number; // e.g. 20 for 20%
  description: string;
  isDefault: boolean;
}

export type DiscountType = 'fixed' | 'percentage';
export type DiscountScope = 'whole_subscription' | 'specific_products';

export interface DiscountRule {
  id: string;
  name: string;
  code: string;
  type: DiscountType;
  value: number; // dollar amount or percentage number (e.g. 15 for 15%)
  minPurchaseAmount?: number;
  minQuantity?: number; // e.g., taking >= 10 seats
  startDate: string;
  endDate: string;
  usageLimit: number;
  timesUsed: number;
  scope: DiscountScope;
  applicableProductIds?: string[];
  isActive: boolean;
  createdAt: string;
}

export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'cancelled' | 'overdue';

export interface InvoiceLine {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string; // e.g., INV-2026-0042
  subscriptionId?: string;
  customerId: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  paymentTerms: string;
  notes?: string;
  sentAt?: string;
  createdAt: string;
}

export type PaymentMethod =
  | 'credit_card'
  | 'bank_transfer'
  | 'ach'
  | 'stripe'
  | 'cash'
  | 'check';

export interface Payment {
  id: string;
  number: string; // e.g., PAY-2026-0019
  invoiceId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
  transactionRef: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}
