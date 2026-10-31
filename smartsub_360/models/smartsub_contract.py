# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class SmartsubContract(models.Model):
    _name = 'smartsub.contract'
    _description = 'Subscription Contract'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'id desc'

    name = fields.Char(
        string="Contract Reference",
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('New'),
        tracking=True,
    )
    partner_id = fields.Many2one(
        comodel_name='res.partner',
        string="Subscriber",
        required=True,
        tracking=True,
        index=True,
        help="Customer holding this subscription.",
    )
    plan_id = fields.Many2one(
        comodel_name='smartsub.plan',
        string="Subscription Plan",
        required=True,
        tracking=True,
        index=True,
        help="Billing plan dictating recurrence intervals and base price.",
    )
    company_id = fields.Many2one(
        comodel_name='res.company',
        string="Company",
        required=True,
        default=lambda self: self.env.company,
    )
    currency_id = fields.Many2one(
        comodel_name='res.currency',
        string="Currency",
        related='plan_id.currency_id',
        store=True,
        readonly=True,
    )
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('active', 'In Progress'),
            ('paused', 'Paused'),
            ('closed', 'Closed'),
        ],
        string="Status",
        default='draft',
        required=True,
        tracking=True,
        copy=False,
        index=True,
    )
    start_date = fields.Date(
        string="Start Date",
        default=fields.Date.context_today,
        required=True,
        tracking=True,
        help="Date when the subscription commences.",
    )
    next_invoice_date = fields.Date(
        string="Next Invoice Date",
        tracking=True,
        index=True,
        help="Target date for generating the next recurring customer invoice.",
    )
    end_date = fields.Date(
        string="End Date",
        tracking=True,
        index=True,
        help="Termination date or scheduled expiration date.",
    )
    recurring_amount = fields.Monetary(
        string="Recurring Amount",
        currency_field='currency_id',
        compute='_compute_recurring_amount',
        store=True,
        readonly=False,
        tracking=True,
        help="Custom recurring price charged per cycle (defaults to plan price).",
    )
    auto_renew = fields.Boolean(
        string="Auto-Renew",
        default=True,
        help="Automatically advance next invoice date upon each billing cycle.",
    )
    invoice_ids = fields.One2many(
        comodel_name='account.move',
        inverse_name='smartsub_contract_id',
        string="Invoices",
        readonly=True,
    )
    invoice_count = fields.Integer(
        string="Invoice Count",
        compute='_compute_invoice_count',
    )
    description = fields.Text(
        string="Terms & Conditions / Notes",
        help="Internal contract notes, special terms, or SLA details.",
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('smartsub.contract') or _('New')
        return super().create(vals_list)

    @api.depends('plan_id', 'plan_id.price')
    def _compute_recurring_amount(self):
        for contract in self:
            if contract.plan_id and not contract.recurring_amount:
                contract.recurring_amount = contract.plan_id.price

    @api.depends('invoice_ids')
    def _compute_invoice_count(self):
        for contract in self:
            contract.invoice_count = len(contract.invoice_ids)

    @api.constrains('start_date', 'end_date')
    def _check_dates_consistency(self):
        for contract in self:
            if contract.start_date and contract.end_date and contract.end_date < contract.start_date:
                raise ValidationError(_("Contract end date (%s) cannot be earlier than start date (%s).") % (
                    contract.end_date, contract.start_date
                ))

    @api.constrains('start_date', 'next_invoice_date')
    def _check_next_invoice_date(self):
        for contract in self:
            if contract.start_date and contract.next_invoice_date and contract.next_invoice_date < contract.start_date:
                raise ValidationError(_("Next invoice date (%s) cannot precede contract start date (%s).") % (
                    contract.next_invoice_date, contract.start_date
                ))

    @api.constrains('recurring_amount')
    def _check_recurring_amount(self):
        for contract in self:
            if contract.recurring_amount < 0.0:
                raise ValidationError(_("Recurring amount cannot be negative."))

    def action_activate(self):
        for contract in self:
            if not contract.next_invoice_date:
                contract.next_invoice_date = contract.start_date
            contract.write({'state': 'active'})

    def action_pause(self):
        self.write({'state': 'paused'})

    def action_close(self):
        self.write({'state': 'closed'})

    def action_draft(self):
        self.write({'state': 'draft'})

    def action_view_invoices(self):
        self.ensure_one()
        return {
            'name': _("Subscription Invoices"),
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'view_mode': 'list,form',
            'domain': [('smartsub_contract_id', '=', self.id)],
            'context': {
                'default_move_type': 'out_invoice',
                'default_smartsub_contract_id': self.id,
                'default_partner_id': self.partner_id.id,
            },
        }
