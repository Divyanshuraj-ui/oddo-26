# -*- coding: utf-8 -*-
"""Dashboard KPI model for SmartSub Analytics.
Provides computed methods that return numeric KPI values.
"""

from odoo import api, fields, models, tools
from odoo.tools import float_round

class SmartsubAnalyticsDashboard(models.TransientModel):
    _name = 'smartsub.analytics.dashboard'
    _description = 'Dashboard KPI calculations'

    @api.model
    def _get_total_revenue(self, date_from=False, date_to=False):
        domain = [('state', '=', 'posted')]
        if date_from:
            domain.append(('invoice_date', '>=', date_from))
        if date_to:
            domain.append(('invoice_date', '<=', date_to))
        invoices = self.env['account.move'].search(domain)
        return float_round(sum(invoices.mapped('amount_total')), precision_digits=2)

    @api.model
    def _get_mrr(self):
        contracts = self.env['smartsub.contract'].search([('state', '=', 'active')])
        total = 0.0
        for c in contracts:
            amount = c.recurring_amount
            # Convert to monthly amount based on plan interval
            factor = 1
            if c.plan_id.billing_interval == 'yearly':
                factor = 1 / 12.0
            elif c.plan_id.billing_interval == 'weekly':
                factor = 4.0  # approximate 4 weeks per month
            elif c.plan_id.billing_interval == 'daily':
                factor = 30.0
            total += amount * factor
        return float_round(total, precision_digits=2)

    @api.model
    def _get_arr(self):
        return float_round(self._get_mrr() * 12, precision_digits=2)

    @api.model
    def _get_active_subscriptions(self):
        return self.env['smartsub.contract'].search_count([('state', '=', 'active')])

    @api.model
    def _get_total_customers(self):
        return self.env['res.partner'].search_count([('smartsub_contract_ids', '!=', False)])

    @api.model
    def _get_new_subscriptions(self, date_from, date_to):
        domain = [('create_date', '>=', date_from), ('create_date', '<=', date_to)]
        return self.env['smartsub.contract'].search_count(domain)

    @api.model
    def _get_pending_payments(self):
        domain = ['|', ('state', '=', 'draft'), ('state', '=', 'posted')]
        domain += [('amount_residual', '>', 0.0)]
        return self.env['account.move'].search_count(domain)

    @api.model
    def _get_overdue_invoices(self):
        today = fields.Date.context_today(self)
        domain = [('date_due', '<', today), ('amount_residual', '>', 0.0)]
        return self.env['account.move'].search_count(domain)

    @api.model
    def _get_churned_subscriptions(self, date_from, date_to):
        domain = [('state', '=', 'closed'), ('end_date', '>=', date_from), ('end_date', '<=', date_to)]
        return self.env['smartsub.contract'].search_count(domain)

    @api.model
    def _get_arpc(self):
        total_rev = self._get_total_revenue()
        cust_cnt = self._get_total_customers()
        if cust_cnt:
            return float_round(total_rev / cust_cnt, precision_digits=2)
        return 0.0
}
