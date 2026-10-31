# -*- coding: utf-8 -*-
from odoo import api, fields, models, tools


class SmartsubRevenueReport(models.Model):
    _name = 'smartsub.revenue.report'
    _description = 'Subscription Revenue & Invoicing Analytical Report'
    _auto = False
    _order = 'invoice_date desc, id desc'

    # Dimensions
    partner_id = fields.Many2one('res.partner', string="Customer", readonly=True)
    contract_id = fields.Many2one('smartsub.contract', string="Contract Reference", readonly=True)
    plan_id = fields.Many2one('smartsub.plan', string="Subscription Plan", readonly=True)
    company_id = fields.Many2one('res.company', string="Company", readonly=True)
    currency_id = fields.Many2one('res.currency', string="Currency", readonly=True)
    invoice_date = fields.Date(string="Invoice Date", readonly=True)
    invoice_date_due = fields.Date(string="Due Date", readonly=True)
    move_state = fields.Selection([
        ('draft', 'Draft'),
        ('posted', 'Posted'),
        ('cancel', 'Cancelled'),
    ], string="Invoice Status", readonly=True)
    payment_state = fields.Selection([
        ('not_paid', 'Not Paid'),
        ('in_payment', 'In Payment'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
        ('reversed', 'Reversed'),
        ('blocked', 'Blocked'),
    ], string="Payment Status", readonly=True)
    contract_state = fields.Selection([
        ('draft', 'Draft'),
        ('active', 'In Progress'),
        ('paused', 'Paused'),
        ('closed', 'Closed'),
    ], string="Contract Lifecycle State", readonly=True)
    billing_cycle = fields.Char(string="Billing Cycle", readonly=True)

    # Measures
    amount_untaxed = fields.Monetary(string="Untaxed Amount", currency_field='currency_id', readonly=True)
    amount_tax = fields.Monetary(string="Tax Amount", currency_field='currency_id', readonly=True)
    amount_total = fields.Monetary(string="Invoiced Total", currency_field='currency_id', readonly=True)
    amount_residual = fields.Monetary(string="Unpaid Balance", currency_field='currency_id', readonly=True)
    amount_collected = fields.Monetary(string="Collected Revenue", currency_field='currency_id', readonly=True)

    def init(self):
        tools.drop_view_if_exists(self.env.cr, self._table)
        self.env.cr.execute("""
            CREATE OR REPLACE VIEW %s AS (
                SELECT
                    m.id AS id,
                    m.partner_id AS partner_id,
                    m.smartsub_contract_id AS contract_id,
                    c.plan_id AS plan_id,
                    m.company_id AS company_id,
                    m.currency_id AS currency_id,
                    m.invoice_date AS invoice_date,
                    m.invoice_date_due AS invoice_date_due,
                    m.state AS move_state,
                    m.payment_state AS payment_state,
                    c.state AS contract_state,
                    c.billing_cycle AS billing_cycle,
                    m.amount_untaxed AS amount_untaxed,
                    m.amount_tax AS amount_tax,
                    m.amount_total AS amount_total,
                    m.amount_residual AS amount_residual,
                    GREATEST(0.0, m.amount_total - m.amount_residual) AS amount_collected
                FROM account_move m
                INNER JOIN smartsub_contract c ON m.smartsub_contract_id = c.id
                WHERE m.move_type = 'out_invoice'
            )
        """ % self._table)


class SmartsubSubscriptionReport(models.Model):
    _name = 'smartsub.subscription.report'
    _description = 'Subscription Contracts & MRR Analytical Report'
    _auto = False
    _order = 'start_date desc, id desc'

    # Dimensions
    partner_id = fields.Many2one('res.partner', string="Customer", readonly=True)
    plan_id = fields.Many2one('smartsub.plan', string="Subscription Plan", readonly=True)
    company_id = fields.Many2one('res.company', string="Company", readonly=True)
    currency_id = fields.Many2one('res.currency', string="Currency", readonly=True)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('active', 'In Progress'),
        ('paused', 'Paused'),
        ('closed', 'Closed'),
    ], string="Status", readonly=True)
    start_date = fields.Date(string="Start Date", readonly=True)
    next_invoice_date = fields.Date(string="Next Invoice Date", readonly=True)
    end_date = fields.Date(string="End Date", readonly=True)
    billing_cycle = fields.Char(string="Billing Cycle", readonly=True)

    # Measures
    contract_count = fields.Integer(string="Contracts Count", readonly=True)
    recurring_amount = fields.Monetary(string="Recurring Price", currency_field='currency_id', readonly=True)
    discount_percentage = fields.Float(string="Discount (%)", readonly=True)
    mrr = fields.Monetary(string="Normalized MRR", currency_field='currency_id', readonly=True)
    arr = fields.Monetary(string="Normalized ARR", currency_field='currency_id', readonly=True)
    total_invoiced = fields.Monetary(string="Total Invoiced", currency_field='currency_id', readonly=True)
    total_paid = fields.Monetary(string="Total Paid", currency_field='currency_id', readonly=True)
    amount_outstanding = fields.Monetary(string="Outstanding Balance", currency_field='currency_id', readonly=True)

    def init(self):
        tools.drop_view_if_exists(self.env.cr, self._table)
        self.env.cr.execute("""
            CREATE OR REPLACE VIEW %s AS (
                SELECT
                    c.id AS id,
                    c.partner_id AS partner_id,
                    c.plan_id AS plan_id,
                    c.company_id AS company_id,
                    c.currency_id AS currency_id,
                    c.state AS state,
                    c.start_date AS start_date,
                    c.next_invoice_date AS next_invoice_date,
                    c.end_date AS end_date,
                    c.billing_cycle AS billing_cycle,
                    1 AS contract_count,
                    COALESCE(c.recurring_amount, 0.0) AS recurring_amount,
                    COALESCE(c.discount_percentage, 0.0) AS discount_percentage,
                    CASE
                        WHEN c.state != 'active' THEN 0.0
                        WHEN c.billing_cycle = 'monthly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0)))
                        WHEN c.billing_cycle = 'quarterly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) / 3.0
                        WHEN c.billing_cycle = 'half_yearly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) / 6.0
                        WHEN c.billing_cycle = 'yearly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) / 12.0
                        WHEN p.billing_interval = 'daily' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) * 30.0 / GREATEST(1, p.interval_count)
                        WHEN p.billing_interval = 'weekly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) * (52.0 / 12.0) / GREATEST(1, p.interval_count)
                        WHEN p.billing_interval = 'yearly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) / (12.0 * GREATEST(1, p.interval_count))
                        ELSE (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) / GREATEST(1, p.interval_count)
                    END AS mrr,
                    CASE
                        WHEN c.state != 'active' THEN 0.0
                        WHEN c.billing_cycle = 'monthly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) * 12.0
                        WHEN c.billing_cycle = 'quarterly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) * 4.0
                        WHEN c.billing_cycle = 'half_yearly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) * 2.0
                        WHEN c.billing_cycle = 'yearly' THEN (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0)))
                        ELSE (c.recurring_amount * (1.0 - (COALESCE(c.discount_percentage, 0.0) / 100.0))) * 12.0 / GREATEST(1, p.interval_count)
                    END AS arr,
                    COALESCE(c.total_invoiced, 0.0) AS total_invoiced,
                    COALESCE(c.total_paid, 0.0) AS total_paid,
                    COALESCE(c.amount_outstanding, 0.0) AS amount_outstanding
                FROM smartsub_contract c
                LEFT JOIN smartsub_plan p ON c.plan_id = p.id
            )
        """ % self._table)
