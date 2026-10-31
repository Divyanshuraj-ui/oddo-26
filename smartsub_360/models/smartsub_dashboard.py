# -*- coding: utf-8 -*-
import calendar
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class SmartsubAnalyticsDashboard(models.TransientModel):
    _name = 'smartsub.analytics.dashboard'
    _description = 'SmartSub 360 Analytics & Command Center Dashboard'

    name = fields.Char(
        string="Dashboard Title",
        default="SmartSub 360 Subscription Intelligence",
        readonly=True,
    )
    company_id = fields.Many2one(
        comodel_name='res.company',
        string="Company",
        default=lambda self: self.env.company,
        required=True,
    )
    currency_id = fields.Many2one(
        comodel_name='res.currency',
        string="Currency",
        related='company_id.currency_id',
        readonly=True,
    )

    # -------------------------------------------------------------------------
    # 1. Interactive Filters
    # -------------------------------------------------------------------------
    date_from = fields.Date(
        string="From Date",
        default=lambda self: fields.Date.context_today(self).replace(month=1, day=1),
        help="Start date for revenue aggregation and new subscriber acquisition.",
    )
    date_to = fields.Date(
        string="To Date",
        default=fields.Date.context_today,
        help="End date for revenue aggregation and metrics.",
    )
    filter_plan_id = fields.Many2one(
        comodel_name='smartsub.plan',
        string="Filter by Plan",
        help="Optional: isolate metrics to a specific subscription plan.",
    )
    filter_partner_id = fields.Many2one(
        comodel_name='res.partner',
        string="Filter by Customer",
        help="Optional: isolate metrics to a specific customer.",
    )
    filter_state = fields.Selection(
        selection=[
            ('all', 'All States'),
            ('draft', 'Draft'),
            ('active', 'Active'),
            ('paused', 'Paused'),
            ('closed', 'Closed'),
        ],
        string="Subscription State",
        default='all',
        help="Filter contracts by lifecycle status.",
    )

    # -------------------------------------------------------------------------
    # 2. Executive KPIs (Computed dynamically from real database records)
    # -------------------------------------------------------------------------
    total_revenue = fields.Monetary(
        string="Collected Revenue",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Total actually collected cash payments on subscription invoices within the selected period.",
    )
    total_invoiced = fields.Monetary(
        string="Invoiced Revenue",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Total gross invoiced amount on posted customer invoices within the period.",
    )
    pending_payments = fields.Monetary(
        string="Pending Receivables",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Outstanding unpaid balance across posted subscription invoices.",
    )
    collection_rate = fields.Float(
        string="Collection Rate (%)",
        compute='_compute_all_metrics',
        help="Percentage of invoiced revenue that has been successfully collected.",
    )
    mrr = fields.Monetary(
        string="Monthly Recurring Revenue (MRR)",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Normalized 30-day recurring revenue derived from active subscriptions.",
    )
    arr = fields.Monetary(
        string="Annual Recurring Revenue (ARR)",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Annualized recurring revenue (MRR * 12).",
    )
    active_subscriptions = fields.Integer(
        string="Active Subscriptions",
        compute='_compute_all_metrics',
        help="Total currently active subscription contracts.",
    )
    total_customers = fields.Integer(
        string="Active Customers",
        compute='_compute_all_metrics',
        help="Unique customer count holding active subscription agreements.",
    )
    new_subscriptions = fields.Integer(
        string="New Subscriptions",
        compute='_compute_all_metrics',
        help="Subscriptions created or started within the selected date window.",
    )
    churned_subscriptions = fields.Integer(
        string="Churned Subscriptions",
        compute='_compute_all_metrics',
        help="Total subscription contracts that have been terminated or closed.",
    )
    churn_rate = fields.Float(
        string="Churn Rate (%)",
        compute='_compute_all_metrics',
        help="Ratio of churned contracts relative to total contracts.",
    )
    arpc = fields.Monetary(
        string="Avg Revenue Per Customer (ARPC)",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Average monthly revenue generated per active subscriber.",
    )
    overdue_invoices_count = fields.Integer(
        string="Overdue Invoices",
        compute='_compute_all_metrics',
        help="Count of unpaid posted subscription customer invoices past due date.",
    )
    overdue_invoices_amount = fields.Monetary(
        string="Overdue Amount",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Total past-due residual amount at risk of collection failure.",
    )
    revenue_growth_rate = fields.Float(
        string="Revenue Growth (%)",
        compute='_compute_all_metrics',
        help="Period-over-period collected revenue growth percentage.",
    )
    upcoming_renewals_count = fields.Integer(
        string="Upcoming Renewals (30d)",
        compute='_compute_all_metrics',
        help="Active contracts due for renewal or invoice generation within the next 30 days.",
    )
    total_leakage_detected = fields.Monetary(
        string="Detected Revenue Leakage",
        currency_field='currency_id',
        compute='_compute_all_metrics',
        help="Unbilled cycles, overdue invoices, and uncollected subscription revenue.",
    )

    # -------------------------------------------------------------------------
    # 3. Breakdown Collections (Populated dynamically for dashboard tables)
    # -------------------------------------------------------------------------
    top_customer_ids = fields.One2many(
        comodel_name='smartsub.dashboard.top.customer',
        inverse_name='dashboard_id',
        string="Top Customers",
    )
    plan_stat_ids = fields.One2many(
        comodel_name='smartsub.dashboard.plan.stat',
        inverse_name='dashboard_id',
        string="Plan Performance",
    )
    monthly_trend_ids = fields.One2many(
        comodel_name='smartsub.dashboard.monthly.trend',
        inverse_name='dashboard_id',
        string="Revenue Trends",
    )
    leakage_alert_ids = fields.One2many(
        comodel_name='smartsub.dashboard.leakage.alert',
        inverse_name='dashboard_id',
        string="Leakage Alerts",
    )

    # -------------------------------------------------------------------------
    # MRR Normalization Helper
    # -------------------------------------------------------------------------
    @api.model
    def _normalize_contract_mrr(self, contract):
        """Calculates normalized monthly recurring revenue for a subscription contract.
        Accounts for recurring amount, discount percentage, billing cycle, and plan intervals.
        """
        if not contract or contract.state != 'active':
            return 0.0

        # Base recurring net amount after discount
        base_amount = contract.recurring_amount or 0.0
        discount = getattr(contract, 'discount_percentage', 0.0) or 0.0
        net_recurring = base_amount * (1.0 - (discount / 100.0))

        cycle = getattr(contract, 'billing_cycle', 'custom') or 'custom'
        if cycle == 'monthly':
            return net_recurring
        elif cycle == 'quarterly':
            return net_recurring / 3.0
        elif cycle == 'half_yearly':
            return net_recurring / 6.0
        elif cycle == 'yearly':
            return net_recurring / 12.0
        else:
            plan = contract.plan_id
            if not plan:
                return net_recurring

            interval = plan.billing_interval or 'monthly'
            count = plan.interval_count if plan.interval_count and plan.interval_count > 0 else 1

            if interval == 'daily':
                return (net_recurring * 30.0) / count
            elif interval == 'weekly':
                return (net_recurring * (52.0 / 12.0)) / count
            elif interval == 'monthly':
                return net_recurring / count
            elif interval == 'yearly':
                return net_recurring / (12.0 * count)
            return net_recurring

    # -------------------------------------------------------------------------
    # Comprehensive Dynamic Metric Compute Engine
    # -------------------------------------------------------------------------
    @api.depends(
        'date_from', 'date_to', 'filter_plan_id', 'filter_partner_id', 'filter_state', 'company_id'
    )
    def _compute_all_metrics(self):
        today = fields.Date.context_today(self)
        for dash in self:
            date_start = dash.date_from or date(today.year, 1, 1)
            date_end = dash.date_to or today

            # -----------------------------------------------------------------
            # 1. Base Contract Domain
            # -----------------------------------------------------------------
            contract_domain = [('company_id', '=', dash.company_id.id)]
            if dash.filter_plan_id:
                contract_domain.append(('plan_id', '=', dash.filter_plan_id.id))
            if dash.filter_partner_id:
                contract_domain.append(('partner_id', '=', dash.filter_partner_id.id))
            if dash.filter_state and dash.filter_state != 'all':
                contract_domain.append(('state', '=', dash.filter_state))

            contracts = self.env['smartsub.contract'].search(contract_domain)
            active_contracts = contracts.filtered(lambda c: c.state == 'active')
            churned_contracts = contracts.filtered(lambda c: c.state == 'closed')

            # Active Subscriptions & Unique Customers
            dash.active_subscriptions = len(active_contracts)
            dash.total_customers = len(set(active_contracts.mapped('partner_id.id')))
            dash.churned_subscriptions = len(churned_contracts)

            # Churn Rate
            total_active_and_churned = dash.active_subscriptions + dash.churned_subscriptions
            if total_active_and_churned > 0:
                dash.churn_rate = round((dash.churned_subscriptions / float(total_active_and_churned)) * 100.0, 1)
            else:
                dash.churn_rate = 0.0

            # New Subscriptions within date range
            new_contract_domain = list(contract_domain)
            new_contract_domain.extend([
                ('start_date', '>=', date_start),
                ('start_date', '<=', date_end),
            ])
            dash.new_subscriptions = self.env['smartsub.contract'].search_count(new_contract_domain)

            # MRR & ARR calculation across all active subscriptions
            total_mrr = sum(self._normalize_contract_mrr(c) for c in active_contracts)
            dash.mrr = total_mrr
            dash.arr = total_mrr * 12.0

            # ARPC (Average Revenue Per Customer)
            if dash.total_customers > 0:
                dash.arpc = total_mrr / float(dash.total_customers)
            else:
                dash.arpc = 0.0

            # Upcoming Renewals (next 30 days)
            in_30_days = today + timedelta(days=30)
            renewals = active_contracts.filtered(
                lambda c: c.next_invoice_date and today <= c.next_invoice_date <= in_30_days
            )
            dash.upcoming_renewals_count = len(renewals)

            # -----------------------------------------------------------------
            # 2. Invoicing & Payment Analysis from Real account.move Records
            # -----------------------------------------------------------------
            move_domain = [
                ('smartsub_contract_id', '!=', False),
                ('state', '=', 'posted'),
                ('move_type', '=', 'out_invoice'),
                ('company_id', '=', dash.company_id.id),
                ('invoice_date', '>=', date_start),
                ('invoice_date', '<=', date_end),
            ]
            if dash.filter_plan_id:
                move_domain.append(('smartsub_contract_id.plan_id', '=', dash.filter_plan_id.id))
            if dash.filter_partner_id:
                move_domain.append(('partner_id', '=', dash.filter_partner_id.id))

            posted_moves = self.env['account.move'].search(move_domain)
            invoiced_sum = sum(posted_moves.mapped('amount_total'))
            residual_sum = sum(posted_moves.mapped('amount_residual'))
            collected_sum = max(0.0, invoiced_sum - residual_sum)

            dash.total_invoiced = invoiced_sum
            dash.pending_payments = residual_sum
            dash.total_revenue = collected_sum

            # Collection Rate
            if invoiced_sum > 0.0:
                dash.collection_rate = round((collected_sum / invoiced_sum) * 100.0, 1)
            else:
                dash.collection_rate = 100.0 if collected_sum > 0.0 else 0.0

            # Overdue Invoices
            overdue_moves = posted_moves.filtered(
                lambda m: m.payment_state in ('not_paid', 'partial')
                and m.invoice_date_due
                and m.invoice_date_due < today
            )
            dash.overdue_invoices_count = len(overdue_moves)
            dash.overdue_invoices_amount = sum(overdue_moves.mapped('amount_residual'))

            # Period-over-period Growth Rate
            period_days = max(1, (date_end - date_start).days)
            prior_end = date_start - timedelta(days=1)
            prior_start = prior_end - timedelta(days=period_days)

            prior_move_domain = [
                ('smartsub_contract_id', '!=', False),
                ('state', '=', 'posted'),
                ('move_type', '=', 'out_invoice'),
                ('company_id', '=', dash.company_id.id),
                ('invoice_date', '>=', prior_start),
                ('invoice_date', '<=', prior_end),
            ]
            if dash.filter_plan_id:
                prior_move_domain.append(('smartsub_contract_id.plan_id', '=', dash.filter_plan_id.id))
            if dash.filter_partner_id:
                prior_move_domain.append(('partner_id', '=', dash.filter_partner_id.id))

            prior_moves = self.env['account.move'].search(prior_move_domain)
            prior_revenue = sum(prior_moves.mapped('amount_total')) - sum(prior_moves.mapped('amount_residual'))

            if prior_revenue > 0.0:
                dash.revenue_growth_rate = round(((collected_sum - prior_revenue) / prior_revenue) * 100.0, 1)
            else:
                dash.revenue_growth_rate = 100.0 if collected_sum > 0.0 else 0.0

            # -----------------------------------------------------------------
            # 3. Revenue Leakage Calculation (Deduplicated Financial Loss)
            # -----------------------------------------------------------------
            leakage_total = 0.0
            # A. Unbilled active subscriptions
            unbilled_subs = active_contracts.filtered(
                lambda c: c.next_invoice_date and c.next_invoice_date <= today
            )
            for sub in unbilled_subs:
                # Check if invoice exists for that period start
                has_invoice = self.env['account.move'].search_count([
                    ('smartsub_contract_id', '=', sub.id),
                    ('smartsub_period_start', '=', sub.next_invoice_date),
                    ('move_type', '=', 'out_invoice'),
                    ('state', '!=', 'cancel'),
                ])
                if not has_invoice:
                    leakage_total += sub.recurring_amount

            # B. Overdue unpaid invoices
            leakage_total += dash.overdue_invoices_amount
            dash.total_leakage_detected = leakage_total

    # -------------------------------------------------------------------------
    # Populate Breakdown Tables
    # -------------------------------------------------------------------------
    def _rebuild_breakdown_tables(self):
        """Populates transient child lines for dashboard tables without committing garbage."""
        self.ensure_one()
        today = fields.Date.context_today(self)

        # Clear existing transient children
        self.top_customer_ids.unlink()
        self.plan_stat_ids.unlink()
        self.monthly_trend_ids.unlink()
        self.leakage_alert_ids.unlink()

        # 1. Top Customers Breakdown
        partner_stats = {}
        all_contracts = self.env['smartsub.contract'].search([('company_id', '=', self.company_id.id)])
        for contract in all_contracts:
            pid = contract.partner_id.id
            if pid not in partner_stats:
                partner_stats[pid] = {
                    'partner_id': pid,
                    'contract_count': 0,
                    'total_paid': 0.0,
                    'mrr': 0.0,
                    'status': contract.partner_id.smartsub_status if hasattr(contract.partner_id, 'smartsub_status') else 'active',
                }
            partner_stats[pid]['contract_count'] += 1
            if contract.state == 'active':
                partner_stats[pid]['mrr'] += self._normalize_contract_mrr(contract)
            partner_stats[pid]['total_paid'] += getattr(contract, 'total_paid', 0.0)

        # Sort top 10 customers by total paid or MRR
        top_partners = sorted(partner_stats.values(), key=lambda x: (x['total_paid'], x['mrr']), reverse=True)[:10]
        for p in top_partners:
            self.env['smartsub.dashboard.top.customer'].create({
                'dashboard_id': self.id,
                'partner_id': p['partner_id'],
                'contract_count': p['contract_count'],
                'total_paid': p['total_paid'],
                'mrr': p['mrr'],
                'status': p['status'],
            })

        # 2. Plan Performance Breakdown
        plans = self.env['smartsub.plan'].search([('company_id', '=', self.company_id.id)])
        total_dash_mrr = self.mrr or 1.0
        for plan in plans:
            plan_contracts = all_contracts.filtered(lambda c: c.plan_id.id == plan.id)
            active_plan_contracts = plan_contracts.filtered(lambda c: c.state == 'active')
            plan_rev = sum(getattr(c, 'total_paid', 0.0) for c in plan_contracts)
            plan_mrr = sum(self._normalize_contract_mrr(c) for c in active_plan_contracts)
            share_pct = round((plan_mrr / total_dash_mrr) * 100.0, 1) if total_dash_mrr > 0 else 0.0

            self.env['smartsub.dashboard.plan.stat'].create({
                'dashboard_id': self.id,
                'plan_id': plan.id,
                'subscriber_count': len(active_plan_contracts),
                'total_revenue': plan_rev,
                'mrr': plan_mrr,
                'share_percentage': share_pct,
            })

        # 3. Monthly Revenue Trend (Last 6 Months)
        current_cursor = today.replace(day=1)
        for _ in range(6):
            m_start = current_cursor
            last_day = calendar.monthrange(m_start.year, m_start.month)[1]
            m_end = current_cursor.replace(day=last_day)
            m_label = m_start.strftime("%b %Y")

            m_moves = self.env['account.move'].search([
                ('smartsub_contract_id', '!=', False),
                ('state', '=', 'posted'),
                ('move_type', '=', 'out_invoice'),
                ('company_id', '=', self.company_id.id),
                ('invoice_date', '>=', m_start),
                ('invoice_date', '<=', m_end),
            ])
            inv_amt = sum(m_moves.mapped('amount_total'))
            coll_amt = max(0.0, inv_amt - sum(m_moves.mapped('amount_residual')))

            new_count = self.env['smartsub.contract'].search_count([
                ('company_id', '=', self.company_id.id),
                ('start_date', '>=', m_start),
                ('start_date', '<=', m_end),
            ])
            churn_count = self.env['smartsub.contract'].search_count([
                ('company_id', '=', self.company_id.id),
                ('state', '=', 'closed'),
                ('write_date', '>=', m_start),
                ('write_date', '<=', m_end),
            ])

            self.env['smartsub.dashboard.monthly.trend'].create({
                'dashboard_id': self.id,
                'month_name': m_label,
                'invoiced_amount': inv_amt,
                'collected_amount': coll_amt,
                'new_contracts': new_count,
                'churned_contracts': churn_count,
            })
            current_cursor = current_cursor - relativedelta(months=1)

        # 4. Revenue Leakage Alert Feed
        leakage_items = []
        # Check active contracts with unbilled next_invoice_date
        unbilled_contracts = self.env['smartsub.contract'].search([
            ('company_id', '=', self.company_id.id),
            ('state', '=', 'active'),
            ('next_invoice_date', '<=', today),
        ], limit=8)
        for c in unbilled_contracts:
            has_inv = self.env['account.move'].search_count([
                ('smartsub_contract_id', '=', c.id),
                ('smartsub_period_start', '=', c.next_invoice_date),
                ('move_type', '=', 'out_invoice'),
                ('state', '!=', 'cancel'),
            ])
            if not has_inv:
                delay = (today - c.next_invoice_date).days if c.next_invoice_date else 0
                risk = 'critical' if delay > 7 else 'high'
                leakage_items.append({
                    'issue_type': 'missing_invoice',
                    'contract_id': c.id,
                    'partner_id': c.partner_id.id,
                    'financial_impact': c.recurring_amount,
                    'risk_level': risk,
                    'suggested_action': _("Invoice generation pending for %d days. Trigger recurring billing.") % delay,
                })

        # Check overdue invoices
        overdue_invoices = self.env['account.move'].search([
            ('smartsub_contract_id', '!=', False),
            ('company_id', '=', self.company_id.id),
            ('state', '=', 'posted'),
            ('payment_state', 'in', ('not_paid', 'partial')),
            ('invoice_date_due', '<', today),
        ], order='invoice_date_due asc', limit=8)
        for inv in overdue_invoices:
            days = (today - inv.invoice_date_due).days if inv.invoice_date_due else 0
            risk = 'critical' if days > 15 else ('high' if days > 7 else 'medium')
            leakage_items.append({
                'issue_type': 'overdue_payment',
                'contract_id': inv.smartsub_contract_id.id,
                'partner_id': inv.partner_id.id,
                'financial_impact': inv.amount_residual,
                'risk_level': risk,
                'suggested_action': _("Invoice %s is %d days past due. Send recovery dunning reminder.") % (inv.name, days),
            })

        for item in leakage_items[:10]:
            item['dashboard_id'] = self.id
            self.env['smartsub.dashboard.leakage.alert'].create(item)

    # -------------------------------------------------------------------------
    # Dashboard Actions & Drill-Downs
    # -------------------------------------------------------------------------
    def action_refresh(self):
        """Refreshes all KPIs and re-builds analytical breakdown tables."""
        self.ensure_one()
        self._compute_all_metrics()
        self._rebuild_breakdown_tables()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'smartsub.analytics.dashboard',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_reset_filters(self):
        """Resets filter values to default year-to-date and all states."""
        today = fields.Date.context_today(self)
        self.write({
            'date_from': today.replace(month=1, day=1),
            'date_to': today,
            'filter_plan_id': False,
            'filter_partner_id': False,
            'filter_state': 'all',
        })
        return self.action_refresh()

    def action_view_active_contracts(self):
        """Drill-down action to list all active subscription contracts."""
        return {
            'name': _("Active Subscription Contracts"),
            'type': 'ir.actions.act_window',
            'res_model': 'smartsub.contract',
            'view_mode': 'list,form',
            'domain': [('state', '=', 'active'), ('company_id', '=', self.company_id.id)],
            'context': {'default_state': 'active'},
        }

    def action_view_churned_contracts(self):
        """Drill-down action to list closed or churned contracts."""
        return {
            'name': _("Churned Subscription Contracts"),
            'type': 'ir.actions.act_window',
            'res_model': 'smartsub.contract',
            'view_mode': 'list,form',
            'domain': [('state', '=', 'closed'), ('company_id', '=', self.company_id.id)],
        }

    def action_view_overdue_invoices(self):
        """Drill-down action to view overdue customer invoices."""
        today = fields.Date.context_today(self)
        return {
            'name': _("Overdue Subscription Invoices"),
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'view_mode': 'list,form',
            'domain': [
                ('smartsub_contract_id', '!=', False),
                ('state', '=', 'posted'),
                ('payment_state', 'in', ('not_paid', 'partial')),
                ('invoice_date_due', '<', today),
                ('company_id', '=', self.company_id.id),
            ],
        }

    def action_view_unpaid_invoices(self):
        """Drill-down action to view all outstanding subscription invoices."""
        return {
            'name': _("Outstanding Subscription Invoices"),
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'view_mode': 'list,form',
            'domain': [
                ('smartsub_contract_id', '!=', False),
                ('state', '=', 'posted'),
                ('payment_state', 'in', ('not_paid', 'partial')),
                ('company_id', '=', self.company_id.id),
            ],
        }

    def action_view_upcoming_renewals(self):
        """Drill-down action to view contracts renewing in next 30 days."""
        today = fields.Date.context_today(self)
        in_30_days = today + timedelta(days=30)
        return {
            'name': _("Upcoming Subscription Renewals (Next 30 Days)"),
            'type': 'ir.actions.act_window',
            'res_model': 'smartsub.contract',
            'view_mode': 'list,form',
            'domain': [
                ('state', '=', 'active'),
                ('next_invoice_date', '>=', today),
                ('next_invoice_date', '<=', in_30_days),
                ('company_id', '=', self.company_id.id),
            ],
        }

    @api.model
    def open_dashboard(self):
        """Entry point action to initialize and launch the dashboard in form view."""
        today = fields.Date.context_today(self)
        dash = self.create({
            'date_from': today.replace(month=1, day=1),
            'date_to': today,
        })
        dash._compute_all_metrics()
        dash._rebuild_breakdown_tables()
        return {
            'name': _("Subscription Command Center"),
            'type': 'ir.actions.act_window',
            'res_model': 'smartsub.analytics.dashboard',
            'res_id': dash.id,
            'view_mode': 'form',
            'target': 'current',
        }


# -----------------------------------------------------------------------------
# Supporting Transient Child Models for Structured Dashboard Tables
# -----------------------------------------------------------------------------

class SmartsubDashboardTopCustomer(models.TransientModel):
    _name = 'smartsub.dashboard.top.customer'
    _description = 'Top Customer Revenue Line'
    _order = 'total_paid desc, mrr desc'

    dashboard_id = fields.Many2one('smartsub.analytics.dashboard', ondelete='cascade', required=True)
    partner_id = fields.Many2one('res.partner', string="Customer", required=True)
    contract_count = fields.Integer(string="Contracts")
    currency_id = fields.Many2one('res.currency', related='dashboard_id.currency_id')
    total_paid = fields.Monetary(string="Total Paid", currency_field='currency_id')
    mrr = fields.Monetary(string="Active MRR", currency_field='currency_id')
    status = fields.Char(string="Status")


class SmartsubDashboardPlanStat(models.TransientModel):
    _name = 'smartsub.dashboard.plan.stat'
    _description = 'Plan Performance Metric Line'
    _order = 'mrr desc, total_revenue desc'

    dashboard_id = fields.Many2one('smartsub.analytics.dashboard', ondelete='cascade', required=True)
    plan_id = fields.Many2one('smartsub.plan', string="Subscription Plan", required=True)
    subscriber_count = fields.Integer(string="Subscribers")
    currency_id = fields.Many2one('res.currency', related='dashboard_id.currency_id')
    total_revenue = fields.Monetary(string="Total Revenue", currency_field='currency_id')
    mrr = fields.Monetary(string="MRR", currency_field='currency_id')
    share_percentage = fields.Float(string="Revenue Share (%)")


class SmartsubDashboardMonthlyTrend(models.TransientModel):
    _name = 'smartsub.dashboard.monthly.trend'
    _description = 'Monthly Revenue Trend Line'
    _order = 'id desc'

    dashboard_id = fields.Many2one('smartsub.analytics.dashboard', ondelete='cascade', required=True)
    month_name = fields.Char(string="Month", required=True)
    currency_id = fields.Many2one('res.currency', related='dashboard_id.currency_id')
    invoiced_amount = fields.Monetary(string="Invoiced", currency_field='currency_id')
    collected_amount = fields.Monetary(string="Collected", currency_field='currency_id')
    new_contracts = fields.Integer(string="New Subs")
    churned_contracts = fields.Integer(string="Churned Subs")


class SmartsubDashboardLeakageAlert(models.TransientModel):
    _name = 'smartsub.dashboard.leakage.alert'
    _description = 'Revenue Leakage Detection Alert'
    _order = 'risk_level asc, financial_impact desc'

    dashboard_id = fields.Many2one('smartsub.analytics.dashboard', ondelete='cascade', required=True)
    issue_type = fields.Selection([
        ('missing_invoice', 'Unbilled Active Cycle'),
        ('overdue_payment', 'Overdue Customer Invoice'),
        ('missed_renewal', 'Missed Contract Renewal'),
        ('duplicate_risk', 'Duplicate Billing Risk'),
        ('expired_discount', 'Expired Promotional Rate'),
    ], string="Issue Type", required=True)
    contract_id = fields.Many2one('smartsub.contract', string="Contract Reference")
    partner_id = fields.Many2one('res.partner', string="Customer")
    currency_id = fields.Many2one('res.currency', related='dashboard_id.currency_id')
    financial_impact = fields.Monetary(string="Financial Exposure", currency_field='currency_id')
    risk_level = fields.Selection([
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ], string="Risk Level", default='medium', required=True)
    suggested_action = fields.Char(string="Corrective Action")
