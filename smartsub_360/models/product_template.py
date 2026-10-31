# -*- coding: utf-8 -*-
from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    is_subscription = fields.Boolean(
        string="Can be Subscribed",
        default=False,
        help="Check this box if the product represents a recurring subscription service.",
    )
