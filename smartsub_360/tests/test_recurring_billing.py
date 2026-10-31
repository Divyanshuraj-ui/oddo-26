# -*- coding: utf-8 -*-
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from odoo.exceptions import UserError, ValidationError
from odoo.tests.common import TransactionCase


class TestSmartsubRecurringBilling(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.company = cls.env.company

        # Customer setup
        cls.partner = cls.env['res.partner'].create({
            'name': 'Billing Test Customer',
            'email': 'billing.customer@test.example.com',
        })

        # Recurring Service Product setup
        cls.product = cls.env['product.product'].create({
            'name': 'Cloud SaaS Premium Subscription',
            'type': 'service',
            'is_subscription': True,
            'list_price': 250.0,
        })

        # Base Subscription Plan
        cls.plan = cls.env['smartsub.plan'].create({
            'name': 'Cloud SaaS Monthly Plan',
            'code': 'CLOUD-M-250',
            'billing_interval': 'monthly',
            'interval_count': 1,
            'product_id': cls.product.id,
            'price': 250.0,
            'trial_period_days': 0,
            'auto_close_unpaid_days': 15,
        })

    def test_01_billing_cycles_period_calculation(self):
        """Verify date calculation for monthly, quarterly, half-yearly, and yearly cycles."""
        start = date(2026, 1, 1)
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'start_date': start,
            'next_invoice_date': start,
        })

        # 1. Monthly Cycle
        contract.billing_cycle = 'monthly'
        p_start, p_end, n_start = contract._calculate_billing_period(start)
        self.assertEqual(p_start, date(2026, 1, 1))
        self.assertEqual(p_end, date(2026, 1, 31))
        self.assertEqual(n_start, date(2026, 2, 1))

        # 2. Quarterly Cycle (3 months)
        contract.billing_cycle = 'quarterly'
        p_start, p_end, n_start = contract._calculate_billing_period(start)
        self.assertEqual(p_start, date(2026, 1, 1))
        self.assertEqual(p_end, date(2026, 3, 31))
        self.assertEqual(n_start, date(2026, 4, 1))

        # 3. Half-Yearly Cycle (6 months)
        contract.billing_cycle = 'half_yearly'
        p_start, p_end, n_start = contract._calculate_billing_period(start)
        self.assertEqual(p_start, date(2026, 1, 1))
        self.assertEqual(p_end, date(2026, 6, 30))
        self.assertEqual(n_start, date(2026, 7, 1))

        # 4. Yearly Cycle (12 months)
        contract.billing_cycle = 'yearly'
        p_start, p_end, n_start = contract._calculate_billing_period(start)
        self.assertEqual(p_start, date(2026, 1, 1))
        self.assertEqual(p_end, date(2026, 12, 31))
        self.assertEqual(n_start, date(2027, 1, 1))

    def test_02_discount_calculation_and_validation(self):
        """Verify discount percentage constraint, discount amount compute and line values."""
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'recurring_amount': 200.0,
            'discount_percentage': 15.0,
        })
        # Check computed discount amount
        self.assertEqual(contract.discount_amount, 30.0)

        # Negative discount is rejected
        with self.assertRaises(ValidationError):
            contract.discount_percentage = -5.0

        # Discount > 100% is rejected
        with self.assertRaises(ValidationError):
            contract.discount_percentage = 105.0

        contract.discount_percentage = 20.0
        line_vals = contract._prepare_invoice_line_values(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(line_vals['discount'], 20.0)
        self.assertEqual(line_vals['price_unit'], 200.0)

    def test_03_recurring_invoice_generation(self):
        """Verify customer invoice creation, field mappings, and period date progression."""
        start = date(2026, 1, 1)
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'start_date': start,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()
        contract.next_invoice_date = start

        # Generate invoice
        invoice = contract._create_recurring_invoice(manual=True)

        self.assertEqual(invoice.move_type, 'out_invoice')
        self.assertEqual(invoice.smartsub_contract_id, contract)
        self.assertEqual(invoice.smartsub_period_start, date(2026, 1, 1))
        self.assertEqual(invoice.smartsub_period_end, date(2026, 1, 31))
        self.assertEqual(contract.next_invoice_date, date(2026, 2, 1))
        self.assertEqual(contract.last_invoice_date, date(2026, 1, 1))
        self.assertIn(invoice, contract.invoice_ids)

    def test_04_duplicate_invoice_prevention(self):
        """Ensure generating an invoice for an existing period is strictly prevented."""
        start = date(2026, 1, 1)
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'start_date': start,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()
        contract.next_invoice_date = start

        # First invoice succeeds
        contract._create_recurring_invoice(manual=True)

        # Reset next_invoice_date back to simulate concurrent or duplicate attempt
        contract.next_invoice_date = start
        with self.assertRaises(UserError):
            contract.action_generate_recurring_invoice()

    def test_05_contract_auto_close_on_expiration(self):
        """Ensure contract transitions to 'closed' when recurring invoice completes contract end date."""
        start = date(2026, 1, 1)
        end = date(2026, 1, 31)
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'start_date': start,
            'end_date': end,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()
        contract.next_invoice_date = start

        contract._create_recurring_invoice(manual=True)
        self.assertEqual(contract.state, 'closed')

    def test_06_payment_and_overdue_tracking(self):
        """Verify real-time payment metrics, overdue status and days calculation."""
        today = date.today()
        start = today - timedelta(days=45)

        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'start_date': start,
            'recurring_amount': 500.0,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()
        contract.next_invoice_date = start

        invoice = contract._create_recurring_invoice(manual=True)

        # Post the invoice
        invoice.action_post()
        contract._compute_invoice_stats()

        self.assertEqual(contract.total_invoiced, 500.0)
        self.assertEqual(contract.amount_outstanding, 500.0)
        self.assertEqual(contract.total_paid, 0.0)

        # Simulate past due date
        invoice.invoice_date_due = today - timedelta(days=10)
        contract._compute_invoice_stats()

        self.assertEqual(contract.payment_status, 'overdue')
        self.assertEqual(contract.overdue_amount, 500.0)
        self.assertEqual(contract.overdue_days, 10)
        self.assertEqual(contract.recovery_status, 'attention')

    def test_07_cron_batch_execution(self):
        """Verify automated scheduled cron processes active due contracts."""
        today = date.today()
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
            'start_date': today,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()
        contract.next_invoice_date = today

        # Run cron
        self.env['smartsub.contract'].cron_generate_recurring_invoices()

        self.assertEqual(contract.invoice_count, 1)
        self.assertEqual(contract.last_invoice_date, today)
        self.assertTrue(contract.next_invoice_date > today)
