# -*- coding: utf-8 -*-
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from odoo.tests.common import TransactionCase


class TestSmartsubDashboardAnalytics(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.company = cls.env.company

        # Customer setup
        cls.partner_a = cls.env['res.partner'].create({
            'name': 'Alpha Enterprise Client',
            'email': 'alpha@example.com',
        })
        cls.partner_b = cls.env['res.partner'].create({
            'name': 'Beta Tech Startup',
            'email': 'beta@example.com',
        })

        # Recurring Service Products
        cls.product = cls.env['product.product'].create({
            'name': 'SaaS Analytics Subscription',
            'type': 'service',
            'is_subscription': True,
            'list_price': 300.0,
        })

        # Plans setup
        cls.monthly_plan = cls.env['smartsub.plan'].create({
            'name': 'Professional Monthly Plan',
            'code': 'PRO-M-300',
            'billing_interval': 'monthly',
            'interval_count': 1,
            'product_id': cls.product.id,
            'price': 300.0,
        })
        cls.quarterly_plan = cls.env['smartsub.plan'].create({
            'name': 'Professional Quarterly Plan',
            'code': 'PRO-Q-900',
            'billing_interval': 'monthly',
            'interval_count': 3,
            'product_id': cls.product.id,
            'price': 900.0,
        })

    def test_01_mrr_arr_normalization_math(self):
        """Verify MRR and ARR normalization across varying billing frequencies and discounts."""
        dashboard_model = self.env['smartsub.analytics.dashboard']

        # 1. Monthly Contract with 10% discount
        contract_m = self.env['smartsub.contract'].create({
            'partner_id': self.partner_a.id,
            'plan_id': self.monthly_plan.id,
            'recurring_amount': 300.0,
            'billing_cycle': 'monthly',
            'discount_percentage': 10.0,
        })
        contract_m.action_activate()

        mrr_m = dashboard_model._normalize_contract_mrr(contract_m)
        self.assertEqual(mrr_m, 270.0, "MRR should be 300 * 0.9 = 270.0")

        # 2. Quarterly Contract with no discount (900 / 3 = 300 MRR)
        contract_q = self.env['smartsub.contract'].create({
            'partner_id': self.partner_b.id,
            'plan_id': self.quarterly_plan.id,
            'recurring_amount': 900.0,
            'billing_cycle': 'quarterly',
            'discount_percentage': 0.0,
        })
        contract_q.action_activate()

        mrr_q = dashboard_model._normalize_contract_mrr(contract_q)
        self.assertEqual(mrr_q, 300.0, "Quarterly MRR should be 900 / 3 = 300.0")

        # 3. Inactive or closed contract yields 0 MRR
        contract_m.action_close()
        self.assertEqual(dashboard_model._normalize_contract_mrr(contract_m), 0.0)

    def test_02_kpi_aggregation_real_data(self):
        """Verify dashboard KPIs correctly calculate against active contracts and posted invoices."""
        today = date.today()
        start = today - timedelta(days=20)

        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner_a.id,
            'plan_id': self.monthly_plan.id,
            'start_date': start,
            'next_invoice_date': start,
            'recurring_amount': 300.0,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()

        # Generate invoice
        invoice = contract._create_recurring_invoice(manual=True)
        invoice.action_post()

        # Instantiate dashboard
        dashboard = self.env['smartsub.analytics.dashboard'].create({
            'date_from': today - timedelta(days=60),
            'date_to': today + timedelta(days=10),
        })
        dashboard._compute_all_metrics()

        self.assertEqual(dashboard.active_subscriptions, 1)
        self.assertEqual(dashboard.total_customers, 1)
        self.assertEqual(dashboard.mrr, 300.0)
        self.assertEqual(dashboard.arr, 3600.0)
        self.assertEqual(dashboard.total_invoiced, 300.0)
        self.assertEqual(dashboard.pending_payments, 300.0)
        self.assertEqual(dashboard.total_revenue, 0.0)
        self.assertEqual(dashboard.collection_rate, 0.0)
        self.assertEqual(dashboard.arpc, 300.0)

    def test_03_collection_rate_and_cash_reconciliation(self):
        """Verify collected revenue and collection percentage update dynamically."""
        today = date.today()
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner_a.id,
            'plan_id': self.monthly_plan.id,
            'start_date': today,
            'recurring_amount': 500.0,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()

        invoice = contract._create_recurring_invoice(manual=True)
        invoice.action_post()

        dashboard = self.env['smartsub.analytics.dashboard'].create({
            'date_from': today - timedelta(days=30),
            'date_to': today + timedelta(days=1),
        })
        dashboard._compute_all_metrics()
        self.assertEqual(dashboard.collection_rate, 0.0)

        # Simulate full payment settlement
        invoice.amount_residual = 0.0
        invoice.payment_state = 'paid'

        dashboard._compute_all_metrics()
        self.assertEqual(dashboard.total_revenue, 500.0)
        self.assertEqual(dashboard.pending_payments, 0.0)
        self.assertEqual(dashboard.collection_rate, 100.0)

    def test_04_graceful_empty_database_handling(self):
        """Ensure dashboard handles zero records gracefully without division by zero or errors."""
        # Isolate to non-existent customer domain to simulate empty set
        dummy_partner = self.env['res.partner'].create({'name': 'Zero Data Customer'})
        dashboard = self.env['smartsub.analytics.dashboard'].create({
            'filter_partner_id': dummy_partner.id,
        })
        dashboard._compute_all_metrics()

        self.assertEqual(dashboard.active_subscriptions, 0)
        self.assertEqual(dashboard.total_customers, 0)
        self.assertEqual(dashboard.mrr, 0.0)
        self.assertEqual(dashboard.arr, 0.0)
        self.assertEqual(dashboard.total_invoiced, 0.0)
        self.assertEqual(dashboard.total_revenue, 0.0)
        self.assertEqual(dashboard.collection_rate, 0.0)
        self.assertEqual(dashboard.churn_rate, 0.0)
        self.assertEqual(dashboard.arpc, 0.0)

    def test_05_revenue_leakage_detector(self):
        """Verify leakage detector identifies unbilled cycles and past due receivables."""
        today = date.today()
        past_date = today - timedelta(days=15)

        # Active contract that is past due for invoicing
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner_b.id,
            'plan_id': self.monthly_plan.id,
            'start_date': past_date,
            'recurring_amount': 300.0,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()
        contract.next_invoice_date = past_date

        dashboard = self.env['smartsub.analytics.dashboard'].create({})
        dashboard._compute_all_metrics()
        dashboard._rebuild_breakdown_tables()

        self.assertTrue(dashboard.total_leakage_detected >= 300.0)
        leakage_types = dashboard.leakage_alert_ids.mapped('issue_type')
        self.assertIn('missing_invoice', leakage_types)

    def test_06_breakdown_tables_population(self):
        """Verify top customers, plan stats, and monthly trends are created."""
        today = date.today()
        contract = self.env['smartsub.contract'].create({
            'partner_id': self.partner_a.id,
            'plan_id': self.monthly_plan.id,
            'start_date': today,
            'recurring_amount': 400.0,
            'billing_cycle': 'monthly',
        })
        contract.action_activate()

        dashboard = self.env['smartsub.analytics.dashboard'].create({})
        dashboard._compute_all_metrics()
        dashboard._rebuild_breakdown_tables()

        self.assertTrue(len(dashboard.top_customer_ids) >= 1)
        self.assertTrue(len(dashboard.plan_stat_ids) >= 1)
        self.assertEqual(len(dashboard.monthly_trend_ids), 6)
