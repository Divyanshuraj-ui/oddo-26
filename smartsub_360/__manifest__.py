# -*- coding: utf-8 -*-
{
    'name': 'SmartSub 360 – Intelligent Subscription Management System',
    'version': '19.0.1.0.0',
    'category': 'Sales/Subscriptions',
    'summary': 'Community-driven recurring billing, automated renewals, and lifecycle management',
    'description': """
SmartSub 360 – Intelligent Subscription Management System
==========================================================
A modular, high-performance Odoo 19 Community subscription management system.

Features:
- Native Odoo 19 Community compatibility (zero Enterprise dependencies).
- Subscription plan management with flexible recurring intervals (daily, weekly, monthly, yearly).
- Subscription contract tracking and lifecycle states.
- Clean integration with native Odoo models (res.partner, product.product, account.move).
- Role-based access control (User vs Administrator).
- Multi-company awareness and security rules.
    """,
    'author': 'SmartSub 360 Team',
    'website': 'https://github.com/Divyanshuraj-ui/oddo-26',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'mail',
        'product',
        'sale',
        'account',
    ],
    'data': [
        'security/smartsub_security.xml',
        'security/ir.model.access.csv',
        'data/ir_sequence_data.xml',
        'views/smartsub_plan_views.xml',
        'views/smartsub_contract_views.xml',
        'views/product_template_views.xml',
        'views/res_partner_views.xml',
        'views/account_move_views.xml',
        'views/smartsub_menus.xml',
    ],
    'demo': [
        'demo/demo_data.xml',
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
}
