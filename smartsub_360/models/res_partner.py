# -*- coding: utf-8 -*-
from odoo import api, fields, models, _


class ResPartner(models.Model):
    _inherit = 'res.partner'

    smartsub_contract_ids = fields.One2many(
        comodel_name='smartsub.contract',
        inverse_name='partner_id',
        string="Subscription Contracts",
    )
    smartsub_contract_count = fields.Integer(
        string="Subscriptions",
        compute='_compute_smartsub_contract_count',
        help="Total subscription contracts associated with this partner.",
    )
    smartsub_status = fields.Selection(
        selection=[
            ('none', 'No Subscription'),
            ('active', 'Active Subscriber'),
            ('past_due', 'Past Due'),
            ('churned', 'Former Subscriber'),
        ],
        string="Subscription Status",
        compute='_compute_smartsub_status',
        store=False,
    )

    @api.depends('smartsub_contract_ids', 'smartsub_contract_ids.state')
    def _compute_smartsub_contract_count(self):
        for partner in self:
            partner.smartsub_contract_count = len(partner.smartsub_contract_ids)

    @api.depends('smartsub_contract_ids', 'smartsub_contract_ids.state')
    def _compute_smartsub_status(self):
        for partner in self:
            contracts = partner.smartsub_contract_ids
            if not contracts:
                partner.smartsub_status = 'none'
            elif any(c.state == 'active' for c in contracts):
                partner.smartsub_status = 'active'
            elif any(c.state == 'paused' for c in contracts):
                partner.smartsub_status = 'past_due'
            else:
                partner.smartsub_status = 'churned'

    def action_view_smartsub_contracts(self):
        self.ensure_one()
        return {
            'name': _("Subscription Contracts"),
            'type': 'ir.actions.act_window',
            'res_model': 'smartsub.contract',
            'view_mode': 'list,form',
            'domain': [('partner_id', '=', self.id)],
            'context': {
                'default_partner_id': self.id,
            },
        }
