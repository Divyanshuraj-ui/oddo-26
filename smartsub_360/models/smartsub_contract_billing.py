# -*- coding: utf-8 -*-
import logging
from dateutil.relativedelta import relativedelta

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)


class SmartsubContractBilling(models.Model):
    _inherit = 'smartsub.contract'

    # -------------------------------------------------------------------------
    # 1. Billing Cycle & Pricing Configuration Fields
    # -------------------------------------------------------------------------
    billing_cycle = fields.Selection(
        selection=[
            ('monthly', 'Monthly (1 Month)'),
            ('quarterly', 'Quarterly (3 Months)'),
            ('half_yearly', 'Half-Yearly (6 Months)'),
            ('yearly', 'Yearly (12 Months)'),
            ('custom', 'Plan Default'),
        ],
        string="Billing Cycle",
        default='custom',
        tracking=True,
        help="Billing frequency override. If set to 'Plan Default', uses the plan's recurrence interval.",
    )
    discount_percentage = fields.Float(
        string="Discount (%)",
        default=0.0,
        tracking=True,
        help="Percentage discount applied to recurring invoice lines.",
    )
    discount_amount = fields.Monetary(
        string="Discount Amount",
        currency_field='currency_id',
        compute='_compute_discount_amount',
        help="Monetary value of the discount per recurring cycle.",
    )
    last_invoice_date = fields.Date(
        string="Last Invoiced Date",
        compute='_compute_invoice_stats',
        store=True,
        readonly=True,
        copy=False,
        help="Start date of the most recently generated billing period.",
    )
    next_billing_period_start = fields.Date(
        string="Next Period Start",
        compute='_compute_next_billing_period',
        help="Calculated start date of the upcoming billing cycle.",
    )
    next_billing_period_end = fields.Date(
        string="Next Period End",
        compute='_compute_next_billing_period',
        help="Calculated end date of the upcoming billing cycle.",
    )

    # -------------------------------------------------------------------------
    # 2. Payment Tracking & Overdue Metrics (computed from account.move)
    # -------------------------------------------------------------------------
    total_invoiced = fields.Monetary(
        string="Total Invoiced",
        currency_field='currency_id',
        compute='_compute_invoice_stats',
        store=True,
        help="Aggregate total amount across all posted customer invoices for this subscription.",
    )
    total_paid = fields.Monetary(
        string="Total Paid",
        currency_field='currency_id',
        compute='_compute_invoice_stats',
        store=True,
        help="Actual confirmed payments collected against posted subscription invoices.",
    )
    amount_outstanding = fields.Monetary(
        string="Outstanding Amount",
        currency_field='currency_id',
        compute='_compute_invoice_stats',
        store=True,
        help="Remaining open balance across all posted subscription invoices.",
    )
    payment_status = fields.Selection(
        selection=[
            ('no_invoices', 'No Invoices'),
            ('paid', 'Paid in Full'),
            ('partial', 'Partially Paid'),
            ('unpaid', 'Unpaid'),
            ('overdue', 'Payment Overdue'),
        ],
        string="Payment Status",
        compute='_compute_invoice_stats',
        store=True,
        tracking=True,
        help="Overall real-time payment health of this subscription.",
    )
    overdue_amount = fields.Monetary(
        string="Overdue Amount",
        currency_field='currency_id',
        compute='_compute_invoice_stats',
        store=True,
        help="Total residual amount on past-due posted invoices.",
    )
    overdue_days = fields.Integer(
        string="Days Overdue",
        compute='_compute_invoice_stats',
        store=True,
        help="Maximum days elapsed past due date on unpaid subscription invoices.",
    )
    recovery_status = fields.Selection(
        selection=[
            ('normal', 'In Good Standing'),
            ('in_grace', 'Grace Period'),
            ('attention', 'Attention Needed'),
            ('escalated', 'Escalated / Collection'),
        ],
        string="Recovery Status",
        compute='_compute_invoice_stats',
        store=True,
        tracking=True,
        help="Dunning and payment recovery classification based on overdue duration.",
    )

    # -------------------------------------------------------------------------
    # Constraints
    # -------------------------------------------------------------------------
    @api.constrains('discount_percentage')
    def _check_discount_percentage(self):
        for contract in self:
            if contract.discount_percentage < 0.0 or contract.discount_percentage > 100.0:
                raise ValidationError(_("Discount percentage must be between 0.0% and 100.0%."))

    # -------------------------------------------------------------------------
    # Computes
    # -------------------------------------------------------------------------
    @api.depends('recurring_amount', 'discount_percentage')
    def _compute_discount_amount(self):
        for contract in self:
            if contract.recurring_amount and contract.discount_percentage:
                contract.discount_amount = (contract.recurring_amount * contract.discount_percentage) / 100.0
            else:
                contract.discount_amount = 0.0

    @api.depends('next_invoice_date', 'billing_cycle', 'plan_id', 'plan_id.billing_interval', 'plan_id.interval_count')
    def _compute_next_billing_period(self):
        for contract in self:
            if contract.next_invoice_date:
                p_start, p_end, _ = contract._calculate_billing_period(contract.next_invoice_date)
                contract.next_billing_period_start = p_start
                contract.next_billing_period_end = p_end
            else:
                contract.next_billing_period_start = False
                contract.next_billing_period_end = False

    @api.depends(
        'invoice_ids',
        'invoice_ids.state',
        'invoice_ids.payment_state',
        'invoice_ids.amount_total',
        'invoice_ids.amount_residual',
        'invoice_ids.invoice_date_due',
        'invoice_ids.smartsub_period_start',
    )
    def _compute_invoice_stats(self):
        today = fields.Date.context_today(self)
        for contract in self:
            posted_invoices = contract.invoice_ids.filtered(
                lambda inv: inv.move_type == 'out_invoice' and inv.state == 'posted'
            )
            total_inv = sum(posted_invoices.mapped('amount_total'))
            total_res = sum(posted_invoices.mapped('amount_residual'))
            total_paid = max(0.0, total_inv - total_res)

            # Last invoice date from generated subscription moves
            sub_invoices = contract.invoice_ids.filtered(
                lambda inv: inv.move_type == 'out_invoice' and inv.state != 'cancel'
            )
            period_starts = [inv.smartsub_period_start for inv in sub_invoices if inv.smartsub_period_start]
            contract.last_invoice_date = max(period_starts) if period_starts else False

            contract.total_invoiced = total_inv
            contract.amount_outstanding = total_res
            contract.total_paid = total_paid

            # Overdue invoices tracking
            overdue_invs = posted_invoices.filtered(
                lambda inv: inv.payment_state in ('not_paid', 'partial')
                and inv.invoice_date_due
                and inv.invoice_date_due < today
            )
            contract.overdue_amount = sum(overdue_invs.mapped('amount_residual'))

            max_days = 0
            for inv in overdue_invs:
                days = (today - inv.invoice_date_due).days
                if days > max_days:
                    max_days = days
            contract.overdue_days = max_days

            # Payment status determination
            if not posted_invoices:
                contract.payment_status = 'no_invoices'
            elif overdue_invs:
                contract.payment_status = 'overdue'
            elif total_res > 0.0 and total_paid > 0.0:
                contract.payment_status = 'partial'
            elif total_res > 0.0:
                contract.payment_status = 'unpaid'
            else:
                contract.payment_status = 'paid'

            # Recovery status classification
            auto_close = contract.plan_id.auto_close_unpaid_days if contract.plan_id else 15
            if not overdue_invs or max_days <= 0:
                contract.recovery_status = 'normal'
            elif max_days <= 7:
                contract.recovery_status = 'in_grace'
            elif max_days <= auto_close:
                contract.recovery_status = 'attention'
            else:
                contract.recovery_status = 'escalated'

    # -------------------------------------------------------------------------
    # Period Calculation & Duplicate Prevention Engine
    # -------------------------------------------------------------------------
    def _calculate_billing_period(self, start_date=None):
        """Calculates (period_start, period_end, next_period_start).
        Supports:
        - Monthly: 1 Month
        - Quarterly: 3 Months
        - Half-Yearly: 6 Months
        - Yearly: 12 Months
        - Custom: Uses plan.billing_interval and plan.interval_count
        """
        self.ensure_one()
        p_start = start_date or self.next_invoice_date or self.start_date or fields.Date.context_today(self)

        cycle = self.billing_cycle or 'custom'
        if cycle == 'monthly':
            delta = relativedelta(months=1)
        elif cycle == 'quarterly':
            delta = relativedelta(months=3)
        elif cycle == 'half_yearly':
            delta = relativedelta(months=6)
        elif cycle == 'yearly':
            delta = relativedelta(years=1)
        else:
            plan = self.plan_id
            interval = plan.billing_interval if plan else 'monthly'
            count = plan.interval_count if plan and plan.interval_count > 0 else 1

            if interval == 'daily':
                delta = relativedelta(days=count)
            elif interval == 'weekly':
                delta = relativedelta(weeks=count)
            elif interval == 'monthly':
                delta = relativedelta(months=count)
            elif interval == 'yearly':
                delta = relativedelta(years=count)
            else:
                delta = relativedelta(months=1)

        p_end = p_start + delta - relativedelta(days=1)
        next_start = p_end + relativedelta(days=1)
        return p_start, p_end, next_start

    def _find_duplicate_invoice(self, period_start, period_end):
        """Checks for existing uncancelled invoice for this subscription and period."""
        self.ensure_one()
        return self.env['account.move'].search([
            ('smartsub_contract_id', '=', self.id),
            ('smartsub_period_start', '=', period_start),
            ('move_type', '=', 'out_invoice'),
            ('state', '!=', 'cancel'),
        ], limit=1)

    # -------------------------------------------------------------------------
    # Tax Resolution & Invoice Value Generation (Conforms to INTEGRATION_CONTRACT.md)
    # -------------------------------------------------------------------------
    def _get_applicable_taxes(self):
        """Applies customer fiscal position mapping over product customer taxes."""
        self.ensure_one()
        product = self.plan_id.product_id
        if not product:
            return []
        taxes = product.taxes_id.filtered(lambda t: t.company_id == self.company_id)
        fiscal_pos = self.partner_id.property_account_position_id
        if fiscal_pos:
            taxes = fiscal_pos.map_tax(taxes)
        return [(6, 0, taxes.ids)]

    def _prepare_invoice_values(self, period_start, period_end):
        """Standard hook per docs/INTEGRATION_CONTRACT.md section 3.3."""
        self.ensure_one()
        return {
            'move_type': 'out_invoice',
            'partner_id': self.partner_id.id,
            'currency_id': self.currency_id.id,
            'company_id': self.company_id.id,
            'invoice_date': fields.Date.context_today(self),
            'smartsub_contract_id': self.id,
            'smartsub_period_start': period_start,
            'smartsub_period_end': period_end,
            'invoice_line_ids': [
                (0, 0, self._prepare_invoice_line_values(period_start, period_end))
            ],
        }

    def _prepare_invoice_line_values(self, period_start, period_end):
        """Standard hook per docs/INTEGRATION_CONTRACT.md section 3.3 with tax and discount support."""
        self.ensure_one()
        line_vals = {
            'product_id': self.plan_id.product_id.id,
            'name': f"{self.plan_id.name} ({period_start} to {period_end})",
            'quantity': 1.0,
            'price_unit': self.recurring_amount,
            'discount': self.discount_percentage or 0.0,
        }
        tax_cmds = self._get_applicable_taxes()
        if tax_cmds:
            line_vals['tax_ids'] = tax_cmds
        return line_vals

    # -------------------------------------------------------------------------
    # Invoice Generation Actions
    # -------------------------------------------------------------------------
    def action_generate_recurring_invoice(self):
        """Manual trigger to create next recurring invoice directly from form view."""
        self.ensure_one()
        if self.state != 'active':
            raise UserError(_(
                "Cannot generate invoice for contract '%s': Subscription state must be 'In Progress' (current: '%s')."
            ) % (self.name, dict(self._fields['state'].selection).get(self.state, self.state)))

        if not self.next_invoice_date:
            raise UserError(_("Subscription '%s' has no Next Invoice Date set.") % self.name)

        if self.end_date and self.next_invoice_date > self.end_date:
            raise UserError(_(
                "Next invoice date (%s) exceeds contract expiration date (%s). Contract should be closed."
            ) % (self.next_invoice_date, self.end_date))

        invoice = self._create_recurring_invoice(manual=True)
        return {
            'name': _("Customer Invoice"),
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'view_mode': 'form',
            'res_id': invoice.id,
        }

    def _create_recurring_invoice(self, manual=False):
        """Generates single recurring invoice with duplicate prevention and date advancement."""
        self.ensure_one()
        period_start, period_end, next_start = self._calculate_billing_period(self.next_invoice_date)

        # 1. Duplicate billing validation
        duplicate = self._find_duplicate_invoice(period_start, period_end)
        if duplicate:
            msg = _(
                "Duplicate billing prevented: An invoice (%s, Status: %s) already exists covering period %s to %s."
            ) % (duplicate.name or f"ID {duplicate.id}", duplicate.state, period_start, period_end)
            self.message_post(body=msg)
            if manual:
                raise UserError(msg)
            _logger.warning("SmartSub 360: %s for contract %s", msg, self.name)
            return duplicate

        # 2. Invoice creation
        inv_vals = self._prepare_invoice_values(period_start, period_end)
        invoice = self.env['account.move'].create(inv_vals)

        # 3. Schedule next billing date or close if expired
        if self.auto_renew:
            if self.end_date and next_start > self.end_date:
                self.write({
                    'next_invoice_date': next_start,
                    'state': 'closed',
                })
                self.message_post(body=_(
                    "Contract reached termination date (%s) upon invoice generation. Automatically marked Closed."
                ) % self.end_date)
            else:
                self.write({'next_invoice_date': next_start})
        else:
            self.write({'next_invoice_date': False})

        self.message_post(body=_(
            "Recurring invoice %s created for billing interval %s to %s."
        ) % (invoice.name or f"ID {invoice.id}", period_start, period_end))
        return invoice

    @api.model
    def cron_generate_recurring_invoices(self):
        """Scheduled action to process all due recurring subscription contracts."""
        today = fields.Date.context_today(self)
        contracts = self.search([
            ('state', '=', 'active'),
            ('next_invoice_date', '<=', today),
        ])
        _logger.info("SmartSub 360: Running recurring billing engine for %d due contracts.", len(contracts))

        success_count = 0
        error_count = 0

        for contract in contracts:
            # Check if contract already passed expiration date
            if contract.end_date and contract.next_invoice_date > contract.end_date:
                contract.action_close()
                contract.message_post(body=_("Contract auto-closed by billing cron as next invoice date exceeds end date."))
                continue

            try:
                with self.env.cr.savepoint():
                    contract._create_recurring_invoice(manual=False)
                    success_count += 1
            except Exception as e:
                error_count += 1
                _logger.exception("SmartSub 360: Failed to generate recurring invoice for %s: %s", contract.name, str(e))
                contract.message_post(body=_("Billing Engine Error: Unable to generate invoice: %s") % str(e))

        _logger.info(
            "SmartSub 360: Recurring billing run complete. Generated: %d, Errors: %d",
            success_count, error_count
        )
        return True
