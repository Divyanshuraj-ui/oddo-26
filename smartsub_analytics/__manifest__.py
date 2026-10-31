{
    "name": "SmartSub Analytics",
    "version": "15.0.1.0.0",
    "category": "Sales",
    "summary": "Professional analytics dashboard for SmartSub 360",
    "description": "Provides KPI cards, revenue leakage detection, churn risk scoring and plan recommendations.",
    "author": "Member 3",
    "website": "",
    "depends": ["smartsub_360", "sale", "account"],
    "data": [
        "security/ir.model.access.csv",
        "security/analytics_security.xml",
        "views/dashboard_template.xml",
        "views/churn_score_view.xml",
        "views/revenue_analytics_view.xml",
        "views/recommendation_wizard.xml",
        "docs/MEMBER3_INTEGRATION_NOTES.md"
    ],
    "installable": true,
    "application": false,
    "auto_install": false
}