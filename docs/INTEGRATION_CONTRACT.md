# SmartSub 360 – Integration Contract & Technical Specification

**Project:** SmartSub 360 – Intelligent Subscription Management System  
**Platform:** Odoo 19 Community Edition (LGPL-3)  
**Status:** Approved Architecture Contract  
**Document Version:** 1.0.0  

---

## 1. Executive Architecture & Design Principles

1. **Pure Odoo 19 Community Compatibility**:
   - Zero dependency on Enterprise-only modules (such as `sale_subscription`).
   - Built natively upon core Community foundations: `base`, `mail`, `product`, `sale`, and `account`.
2. **Component Isolation & Developer Boundaries**:
   - Designed for three parallel developer streams without merge conflicts or overlapping data mutations.
   - Shared models adhere strictly to the schema, field types, and method hooks defined in this contract.
3. **Decoupled Relational Architecture**:
   - Unidirectional reference from `smartsub.plan` to `product.product` / `product.template`.
   - Avoid circular `Many2one` linkages between products and plans. A product flag (`is_subscription`) denotes subscription eligibility.
4. **Idempotent Recurring Billing**:
   - Strict invoice date validation and duplicate billing protection on `account.move`.

---

## 2. Shared Data Models & Specifications

### 2.1. Subscription Plan (`smartsub.plan`)
*Master configuration of recurring billing packages, intervals, and pricing rules.*

* **Model Name**: `smartsub.plan`
* **Access Rules**:
  - Regular Users: Read-only (`perm_read=1, perm_write=0, perm_create=0, perm_unlink=0`)
  - Managers / Administrators: Full CRUD (`perm_read=1, perm_write=1, perm_create=1, perm_unlink=1`)
* **Fields**:

| Field Name | Type | Options / Relation | Description |
|---|---|---|---|
| `name` | `Char` | `required=True, translate=True` | Plan name (e.g., "SaaS Pro - Monthly") |
| `code` | `Char` | `index=True` | Plan SKU / internal reference code |
| `active` | `Boolean` | `default=True` | Archive toggle |
| `company_id` | `Many2one` | `'res.company'`, default current company | Multi-company isolation |
| `currency_id` | `Many2one` | `'res.currency'`, related to company | Billing currency |
| `billing_interval` | `Selection` | `[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')]` | Recurrence unit (default: `'monthly'`) |
| `interval_count` | `Integer` | `required=True, default=1` | Multiplier for recurrence unit (must be > 0) |
| `product_id` | `Many2one` | `'product.product'`, `required=True` | Product used for invoice line generation |
| `price` | `Monetary` | `currency_field='currency_id'`, `required=True` | Recurring unit price |
| `trial_period_days` | `Integer` | `default=0` | Grace/trial days before billing starts |
| `auto_close_unpaid_days` | `Integer` | `default=15` | Overdue threshold before suspension |
| `contract_count` | `Integer` | Computed | Total linked contracts |

* **Validation Constraints**:
  - `interval_count` must be strictly positive (`> 0`).
  - `price` must be non-negative (`>= 0.0`).
  - `trial_period_days` and `auto_close_unpaid_days` must be non-negative (`>= 0`).

---

### 2.2. Subscription Contract (`smartsub.contract`)
*The central subscription entity tracking customer agreement, lifecycle, terms, and billing schedule.*

* **Model Name**: `smartsub.contract`
* **Inherits**: `['mail.thread', 'mail.activity.mixin']`
* **Access Rules**:
  - Regular Users: Read, Create, Write (`perm_unlink=0` – deletion is forbidden)
  - Managers / Administrators: Full CRUD
* **States (`state`)**:
  - `draft`: New or quotation stage; pending customer activation.
  - `active`: In progress; generates recurring invoices.
  - `paused`: Temporarily suspended; automated billing skipped.
  - `closed`: Terminated or expired; no further invoices generated.
* **Fields**:

| Field Name | Type | Options / Relation | Description |
|---|---|---|---|
| `name` | `Char` | `readonly=True, default='New', copy=False` | Generated sequence (e.g., `SUB/2026/00001`) |
| `partner_id` | `Many2one` | `'res.partner'`, `required=True, index=True` | Subscriber customer reference |
| `plan_id` | `Many2one` | `'smartsub.plan'`, `required=True, index=True` | Subscribed plan |
| `company_id` | `Many2one` | `'res.company'`, `required=True` | Owning operating unit/company |
| `currency_id` | `Many2one` | `'res.currency'`, related to `plan_id.currency_id` | Contract currency |
| `state` | `Selection` | `[('draft', ...), ('active', ...), ('paused', ...), ('closed', ...)]` | Lifecycle state (default: `'draft'`) |
| `start_date` | `Date` | `required=True, default=today` | Contract commencement date |
| `next_invoice_date` | `Date` | `index=True` | Next scheduled invoice date |
| `end_date` | `Date` | `index=True` | Optional termination or contract expiration date |
| `recurring_amount` | `Monetary` | `currency_field='currency_id'`, computed/stored | Recurring bill amount per cycle |
| `auto_renew` | `Boolean` | `default=True` | Auto-advances `next_invoice_date` upon billing |
| `invoice_ids` | `One2many` | `'account.move'`, `'smartsub_contract_id'` | Historical and draft invoices |
| `invoice_count` | `Integer` | Computed | Total linked customer invoices |
| `description` | `Text` | | Internal notes / SLA terms |

* **Date Validation & Business Rules**:
  - `start_date` is mandatory.
  - If `end_date` is provided, `end_date >= start_date` is enforced.
  - If `next_invoice_date` is provided, `next_invoice_date >= start_date` is enforced.
  - If `end_date` is reached and `auto_renew` is False, the contract transitions to `closed`.

---

### 2.3. Partner Extension (`res.partner`)
*Enriches customer records with subscription visibility without database bloat.*

* **Model Name**: `res.partner` (Inherited)
* **Fields**:
  - `smartsub_contract_ids`: `One2many('smartsub.contract', 'partner_id', string="Subscription Contracts")`
  - `smartsub_contract_count`: `Integer(compute='_compute_smartsub_contract_count', string="Active Subscriptions")`
  - `smartsub_status`: `Selection([('none', 'No Subscription'), ('active', 'Active Subscriber'), ('past_due', 'Past Due'), ('churned', 'Former Subscriber')], compute='_compute_smartsub_status')`

---

### 2.4. Product Extension (`product.template` / `product.product`)
*Marks standard Odoo products for recurring billing without circular dependencies.*

* **Model Name**: `product.template` (Inherited)
* **Fields**:
  - `is_subscription`: `Boolean(string="Can be Subscribed", default=False)`
* **Design Rule**: Avoid back-linking `Many2one` to `smartsub.plan` on `product.template`. Multiple plans (e.g., Monthly vs Annual) can utilize the same recurring service product.

---

### 2.5. Customer Invoice Extension (`account.move`)
*Provides contract attribution and date-period tracking for recurring accounting entries.*

* **Model Name**: `account.move` (Inherited)
* **Fields**:
  - `smartsub_contract_id`: `Many2one('smartsub.contract', string="Subscription Contract", readonly=True, copy=False, index=True)`
  - `smartsub_period_start`: `Date(string="Billing Period Start", readonly=True, copy=False)`
  - `smartsub_period_end`: `Date(string="Billing Period End", readonly=True, copy=False)`

---

## 3. Recurring Invoice Generation & Duplicate Prevention Contract

Developer 2 is responsible for the recurring billing engine. All implementations MUST conform to this exact operational contract:

### 3.1. Pre-Generation Validation & Eligibility Checks
Before an invoice record is generated for `smartsub.contract`, the engine MUST verify:
1. `contract.state == 'active'`
2. `contract.next_invoice_date <= fields.Date.context_today(self)`
3. If `contract.end_date` is set: `contract.next_invoice_date <= contract.end_date`

### 3.2. Duplicate Prevention Rules
To prevent duplicate billing across manual clicks, concurrent cron jobs, or retries:
1. **Existing Draft Check**: Check if an unposted (`state == 'draft'`) invoice already exists for `contract_id` with overlapping period dates (`smartsub_period_start == period_start`).
2. **Existing Posted Check**: Check if a posted (`state == 'posted'`) invoice already covers the identical billing window for the contract.
3. If an invoice exists, log a message in chatter and abort regeneration for that cycle.

### 3.3. Standard Hook Method Signatures
```python
def _prepare_invoice_values(self, period_start, period_end):
    """Returns dict of values for account.move creation."""
    return {
        'move_type': 'out_invoice',
        'partner_id': self.partner_id.id,
        'currency_id': self.currency_id.id,
        'invoice_date': fields.Date.context_today(self),
        'smartsub_contract_id': self.id,
        'smartsub_period_start': period_start,
        'smartsub_period_end': period_end,
        'invoice_line_ids': [
            (0, 0, self._prepare_invoice_line_values(period_start, period_end))
        ],
    }

def _prepare_invoice_line_values(self, period_start, period_end):
    """Returns dict of values for account.move.line creation."""
    return {
        'product_id': self.plan_id.product_id.id,
        'name': f"{self.plan_id.name} ({period_start} to {period_end})",
        'quantity': 1.0,
        'price_unit': self.recurring_amount,
    }
```

---

## 4. Work Allocation & Developer Ownership Matrix

| Stream | Developer | Primary Scope & Deliverables | Restricted Zones (Do Not Touch) |
|---|---|---|---|
| **Stream 1** | **Developer 1 (Lifecycle & Contracts)** | - Contract state machine transitions (`action_activate`, `action_pause`, `action_close`)<br>- Plan configuration views & constraints<br>- Automated contract renewal logic<br>- Customer onboarding wizards | `account.move` generation logic, cron schedule, dashboard SQL/JS |
| **Stream 2** | **Developer 2 (Billing & Invoicing Engine)** | - Automated recurring invoice generation cron (`ir.cron`)<br>- Date calculation engine (`dateutil.relativedelta`)<br>- Duplicate prevention enforcement<br>- Payment tracking and invoice posting listeners | Plan form views, churn prediction analytics |
| **Stream 3** | **Developer 3 (Analytics & AI Churn)** | - KPI compute engines: MRR (Monthly Recurring Revenue), ARR, Churn Rate, LTV<br>- Cohort analysis & reporting views<br>- Customer health scoring model (`smartsub.health.score`)<br>- SmartSub dashboard view | Core billing sequence, account move creation logic |

---

## 5. Security & Multi-Company Architecture

* **Role Isolation**:
  - `SmartSub 360 / User` (`group_smartsub_user`): Designed for operational sales reps. Can create contracts, adjust customer details, and view plans. **Cannot delete contracts** (`perm_unlink=0`), cannot create/edit plans (`perm_write=0, perm_create=0`).
  - `SmartSub 360 / Administrator` (`group_smartsub_manager`): Full administrative permissions including plan configuration, dunning setup, and contract deletion.
* **Multi-Company Record Rules**:
  - Contracts and plans are bound to `company_id`.
  - Multi-company record rules ensure users in multi-company environments only see contracts belonging to allowed companies (`['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]`).
