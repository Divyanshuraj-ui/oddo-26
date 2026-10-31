# -*- coding: utf-8 -*-
from odoo import api, fields, models


class AccountMoveBilling(models.Model):
    _inherit = 'account.move'

    smartsub_is_overdue = fields.Boolean(
        string="Subscription Overdue",
        compute='_compute_smartsub_billing_info',
        store=True,
        index=True,
        help="Indicates whether this subscription customer invoice is overdue and unpaid.",
    )
    smartsub_overdue_days = fields.Integer(
        string="Days Past Due",
        compute='_compute_smartsub_billing_info',
        store=True,
        help="Number of elapsed days past invoice payment due date.",
    )

    @api.depends('invoice_date_due', 'payment_state', 'state', 'smartsub_contract_id')
    def _compute_smartsub_billing_info(self):
        today = fields.Date.context_today(self)
        for move in self:
            if (
                move.smartsub_contract_id
                and move.state == 'posted'
                and move.payment_state in ('not_paid', 'partial')
                and move.invoice_date_due
                and move.invoice_date_due < today
            ):
                move.smartsub_is_overdue = True
                move.smartsub_overdue_days = (today - move.invoice_date_due).days
            else:
                move.smartsub_is_overdue = False
                move.smartsub_overdue_days = 0
