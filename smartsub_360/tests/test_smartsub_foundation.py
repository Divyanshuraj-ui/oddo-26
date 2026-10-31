# -*- coding: utf-8 -*-
from datetime import date, timedelta
from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError


class TestSmartsubFoundation(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner = cls.env['res.partner'].create({
            'name': 'Subscription Test Customer',
            'email': 'customer@test.example.com',
        })
        cls.product = cls.env['product.product'].create({
            'name': 'Test SaaS Subscription Item',
            'type': 'service',
            'is_subscription': True,
            'list_price': 100.0,
        })
        cls.plan = cls.env['smartsub.plan'].create({
            'name': 'Starter Test Plan',
            'code': 'TEST-START-M',
            'billing_interval': 'monthly',
            'interval_count': 1,
            'product_id': cls.product.id,
            'price': 100.0,
            'trial_period_days': 7,
            'auto_close_unpaid_days': 14,
        })

    def test_01_plan_creation(self):
        """Verify plan configuration and initial properties."""
        self.assertEqual(self.plan.billing_interval, 'monthly')
        self.assertEqual(self.plan.interval_count, 1)
        self.assertEqual(self.plan.price, 100.0)
        self.assertEqual(self.plan.currency_id, self.env.company.currency_id)
        self.assertEqual(self.plan.contract_count, 0)

    def test_02_plan_validation_constraints(self):
        """Ensure invalid plan constraints are caught by ORM validations."""
        with self.assertRaises(ValidationError):
            self.env['smartsub.plan'].create({
                'name': 'Invalid Zero Interval Plan',
                'product_id': self.product.id,
                'interval_count': 0,
                'price': 50.0,
            })

        with self.assertRaises(ValidationError):
            self.env['smartsub.plan'].create({
                'name': 'Invalid Negative Price Plan',
                'product_id': self.product.id,
                'interval_count': 1,
                'price': -10.0,
            })

    def test_03_contract_creation_and_sequence(self):
        """Ensure contract creation triggers sequence assignment and price fallback."""
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
        })
        self.assertTrue(contract.name.startswith('SUB/'), "Contract name should follow SUB/ sequence format.")
        self.assertEqual(contract.state, 'draft')
        self.assertEqual(contract.recurring_amount, 100.0)
        self.assertEqual(self.plan.contract_count, 1)

    def test_04_contract_date_validation(self):
        """Verify strict chronological validation on start and end dates."""
        today = date.today()
        yesterday = today - timedelta(days=1)

        with self.assertRaises(ValidationError):
            self.env['smartsub.contract'].create({
                'partner_id': self.partner.id,
                'plan_id': self.plan.id,
                'start_date': today,
                'end_date': yesterday,
            })

        with self.assertRaises(ValidationError):
            self.env['smartsub.contract'].create({
                'partner_id': self.partner.id,
                'plan_id': self.plan.id,
                'start_date': today,
                'next_invoice_date': yesterday,
            })

    def test_05_contract_lifecycle_actions(self):
        """Verify contract state transitions across lifecycle."""
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
        })
        self.assertEqual(contract.state, 'draft')

        # Activation
        contract.action_activate()
        self.assertEqual(contract.state, 'active')
        self.assertTrue(contract.next_invoice_date)

        # Pausing
        contract.action_pause()
        self.assertEqual(contract.state, 'paused')

        # Termination
        contract.action_close()
        self.assertEqual(contract.state, 'closed')

    def test_06_partner_contract_relationship(self):
        """Verify partner computes active subscriptions count and status."""
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner.id,
            'plan_id': self.plan.id,
        })
        contract.action_activate()
        self.partner.invalidate_recordset(['smartsub_contract_ids', 'smartsub_contract_count', 'smartsub_status'])

        self.assertEqual(self.partner.smartsub_contract_count, 1)
        self.assertEqual(self.partner.smartsub_status, 'active')
