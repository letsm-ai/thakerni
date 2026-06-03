"""
Email notifications for admin-driven subscription changes.
Sends a bilingual (EN/AR) email when an admin manually upgrades, downgrades,
or extends a user's subscription via the admin panel.
"""
from datetime import datetime
from typing import Optional
import logging

import resend
import database as _db_module

logger = logging.getLogger(__name__)


PLAN_LABELS = {
    "free": ("Free", "مجاني"),
    "pro": ("Pro", "برو"),
    "business": ("Business", "بزنس"),
}


def _build_subscription_change_html(
    *,
    customer_name: str,
    customer_email: str,
    from_plan: str,
    to_plan: str,
    billing_cycle: Optional[str],
    expires_at: Optional[datetime],
    is_upgrade: bool,
    is_downgrade_to_free: bool,
) -> str:
    from_en, from_ar = PLAN_LABELS.get(from_plan, (from_plan.title(), from_plan))
    to_en, to_ar = PLAN_LABELS.get(to_plan, (to_plan.title(), to_plan))

    if is_downgrade_to_free:
        title_en = "Your subscription has been changed"
        title_ar = "تم تغيير اشتراكك"
        intro_en = f"Your account has been moved from <strong>{from_en}</strong> to <strong>Free</strong>."
        intro_ar = f"تم نقل حسابك من <strong>{from_ar}</strong> إلى <strong>مجاني</strong>."
        accent = "#64748b"
        badge_text = "UPDATED"
    elif is_upgrade:
        title_en = "Welcome to {plan}!".format(plan=to_en)
        title_ar = f"مرحباً بك في باقة {to_ar}!"
        intro_en = (
            f"Great news — your account has been upgraded from "
            f"<strong>{from_en}</strong> to <strong>{to_en}</strong> by our team."
        )
        intro_ar = (
            f"خبر رائع — تم ترقية حسابك من <strong>{from_ar}</strong> "
            f"إلى <strong>{to_ar}</strong> من قبل فريقنا."
        )
        accent = "#7c3aed"
        badge_text = "UPGRADED"
    else:
        title_en = "Your subscription has been updated"
        title_ar = "تم تحديث اشتراكك"
        intro_en = (
            f"Your subscription has been changed from <strong>{from_en}</strong> "
            f"to <strong>{to_en}</strong> by our team."
        )
        intro_ar = (
            f"تم تغيير اشتراكك من <strong>{from_ar}</strong> "
            f"إلى <strong>{to_ar}</strong> من قبل فريقنا."
        )
        accent = "#2563eb"
        badge_text = "UPDATED"

    cycle_block = ""
    if billing_cycle and to_plan != "free":
        cycle_en = "Annual" if billing_cycle == "yearly" else "Monthly"
        cycle_ar = "سنوي" if billing_cycle == "yearly" else "شهري"
        expires_str = expires_at.strftime("%d %b %Y") if expires_at else "—"
        cycle_block = f"""
        <tr><td style="padding:10px 8px;font-size:13px;color:#64748b;">Billing cycle / الفترة</td>
            <td style="padding:10px 8px;text-align:right;font-size:13px;color:#0f172a;font-weight:600;">{cycle_en} / {cycle_ar}</td></tr>
        <tr><td style="padding:10px 8px;font-size:13px;color:#64748b;">Valid until / صالح حتى</td>
            <td style="padding:10px 8px;text-align:right;font-size:13px;color:#0f172a;font-weight:600;">{expires_str}</td></tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{title_en}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#0f172a;">
<div style="max-width:600px;margin:0 auto;padding:24px;">

  <div style="background:linear-gradient(135deg,{accent},#0f172a);border-radius:16px 16px 0 0;padding:32px;color:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 style="margin:0;font-size:24px;letter-spacing:-0.5px;">Let's M AI</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">letsm.ai — Your personal AI assistant</p>
      </div>
      <span style="display:inline-block;padding:6px 14px;background:rgba(255,255,255,0.18);border-radius:999px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">{badge_text}</span>
    </div>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
    <h2 style="margin:0 0 6px;font-size:20px;color:#0f172a;">{title_en}</h2>
    <p style="margin:0 0 18px;font-size:14px;color:#64748b;direction:rtl;text-align:right;">{title_ar}</p>

    <p style="margin:0 0 6px;font-size:14px;color:#334155;line-height:1.6;">Hi {customer_name},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#334155;line-height:1.6;">{intro_en}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;direction:rtl;text-align:right;">{intro_ar}</p>

    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="padding:10px 8px;font-size:13px;color:#64748b;">Plan / الباقة</td>
          <td style="padding:10px 8px;text-align:right;font-size:13px;color:#0f172a;font-weight:600;">{to_en} / {to_ar}</td></tr>
      {cycle_block}
    </table>

    <div style="text-align:center;margin-top:8px;">
      <a href="https://letsm.ai/dashboard/profile" style="display:inline-block;background:{accent};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Open Dashboard / فتح الحساب
      </a>
    </div>

    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
      If you didn't expect this change, please reply to this email and our team will help right away.<br>
      إذا لم تكن تتوقع هذا التغيير، يرجى الرد على هذا البريد وسيقوم فريقنا بمساعدتك فوراً.
    </p>
  </div>

  <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;">Let's M AI · letsm.ai · Sultanate of Oman</p>
</div>
</body></html>"""


async def send_admin_subscription_change_email(
    *,
    customer_email: str,
    customer_name: Optional[str],
    from_plan: str,
    to_plan: str,
    billing_cycle: Optional[str],
    expires_at: Optional[datetime],
) -> bool:
    """Sends a bilingual notification email when an admin changes a user's plan.
    Returns True on success, False on failure. Never blocks the admin action."""
    if not _db_module.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping admin subscription change email")
        return False
    if not customer_email:
        return False

    plan_rank = {"free": 0, "pro": 1, "business": 2}
    is_upgrade = plan_rank.get(to_plan, 0) > plan_rank.get(from_plan, 0)
    is_downgrade_to_free = to_plan == "free" and from_plan != "free"

    name = customer_name or customer_email.split("@")[0]

    to_en, to_ar = PLAN_LABELS.get(to_plan, (to_plan.title(), to_plan))
    if is_downgrade_to_free:
        subject = "Your Let's M AI subscription has been updated · تم تحديث اشتراكك"
    elif is_upgrade:
        subject = f"Welcome to {to_en} · أهلاً في باقة {to_ar} على Let's M AI"
    else:
        subject = f"Your Let's M AI plan was updated to {to_en} · تم تحديث اشتراكك"

    html = _build_subscription_change_html(
        customer_name=name,
        customer_email=customer_email,
        from_plan=from_plan,
        to_plan=to_plan,
        billing_cycle=billing_cycle,
        expires_at=expires_at,
        is_upgrade=is_upgrade,
        is_downgrade_to_free=is_downgrade_to_free,
    )

    try:
        resend.api_key = _db_module.RESEND_API_KEY
        resend.Emails.send({
            "from": f"Let's M AI <{_db_module.SENDER_EMAIL}>",
            "to": [customer_email],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Admin subscription change email sent to {customer_email} ({from_plan} → {to_plan})")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin subscription change email to {customer_email}: {e}")
        return False
