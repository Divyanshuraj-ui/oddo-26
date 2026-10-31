# -*- coding: utf-8 -*-
from odoo import fields, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    smartsub_contract_id = fields.Many2one(
        comodel_name='smartsub.contract',
        string="Subscription Contract",
        readonly=True,
        copy=False,
        index=True,
        help="Subscription contract from which this recurring invoice originated.",
    )
    smartsub_period_start = fields.Date(
        string="Billing Period Start",
        readonly=True,
        copy=False,
        help="Start date of the subscription billing interval covered by this invoice.",
    )
    smartsub_period_end = fields.Date(
        string="Billing Period End",
        readonly=True,
        copy=False,
        help="End date of the subscription billing interval covered by this invoice.",
    )
