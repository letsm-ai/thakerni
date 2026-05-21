"""
Invoice email generation & delivery for Thawani subscriptions.
Generates a clean, RTL-friendly HTML invoice and sends it via Resend.
"""
from datetime import datetime, timezone
from typing import Optional
import logging
import uuid

import resend
import database as _db_module

logger = logging.getLogger(__name__)

# Oman VAT rate (5% as of 2026). The Thawani amount is already the total the
# customer paid, so we back-calculate the net (excluding VAT) for the invoice.
OMAN_VAT_RATE = 0.05
INVOICE_TAX_INCLUSIVE = True


def _split_vat(total_omr: float) -> dict:
    """If price is tax-inclusive, returns net + vat amounts."""
    if INVOICE_TAX_INCLUSIVE:
        net = round(total_omr / (1 + OMAN_VAT_RATE), 3)
        vat = round(total_omr - net, 3)
    else:
        net = total_omr
        vat = round(total_omr * OMAN_VAT_RATE, 3)
    return {"net": net, "vat": vat, "total": total_omr}


def _build_invoice_html(
    *,
    invoice_number: str,
    customer_name: str,
    customer_email: str,
    plan_label: str,
    billing_cycle: str,
    paid_at: datetime,
    expires_at: datetime,
    amounts: dict,
    transaction_id: str,
) -> str:
    """Bilingual (EN/AR) HTML invoice template."""
    paid_str = paid_at.strftime("%d %b %Y, %H:%M UTC")
    period_label = "Annual" if billing_cycle == "yearly" else "Monthly"
    period_ar = "سنوي" if billing_cycle == "yearly" else "شهري"
    expires_str = expires_at.strftime("%d %b %Y")

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Invoice {invoice_number}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#0f172a;">
<div style="max-width:640px;margin:0 auto;padding:24px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#06b6d4,#2563eb);border-radius:16px 16px 0 0;padding:32px;color:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 style="margin:0;font-size:26px;letter-spacing:-0.5px;">Let's M AI</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">letsm.ai — Your personal AI assistant</p>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:6px 14px;background:rgba(255,255,255,0.18);border-radius:999px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">PAID</span>
      </div>
    </div>
  </div>

  <!-- Invoice details -->
  <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:24px;margin-bottom:32px;">
      <div>
        <p style="margin:0;font-size:11px;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Invoice / فاتورة</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#0f172a;">{invoice_number}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Payment Date / تاريخ الدفع</p>
        <p style="margin:6px 0 0;font-size:14px;color:#0f172a;">{paid_str}</p>
      </div>
    </div>

    <!-- Customer -->
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Billed To / فوترة إلى</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">{customer_name}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#64748b;">{customer_email}</p>
    </div>

    <!-- Items table -->
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0;">
          <th style="text-align:left;padding:12px 8px;font-size:11px;color:#64748b;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Description / الوصف</th>
          <th style="text-align:right;padding:12px 8px;font-size:11px;color:#64748b;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Amount / المبلغ</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:16px 8px;font-size:14px;">
            <div style="font-weight:600;color:#0f172a;">{plan_label}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">{period_label} Subscription / اشتراك {period_ar}</div>
            <div style="font-size:12px;color:#64748b;">Renewal date: {expires_str}</div>
          </td>
          <td style="padding:16px 8px;text-align:right;font-size:14px;color:#0f172a;font-weight:600;">{amounts['net']:.3f} OMR</td>
        </tr>
        <tr>
          <td style="padding:12px 8px;font-size:13px;color:#64748b;">VAT 5% / ضريبة القيمة المضافة</td>
          <td style="padding:12px 8px;text-align:right;font-size:13px;color:#64748b;">{amounts['vat']:.3f} OMR</td>
        </tr>
        <tr style="border-top:2px solid #0f172a;">
          <td style="padding:16px 8px;font-size:15px;font-weight:700;color:#0f172a;">Total / الإجمالي</td>
          <td style="padding:16px 8px;text-align:right;font-size:18px;font-weight:700;color:#0f172a;">{amounts['total']:.3f} OMR</td>
        </tr>
      </tbody>
    </table>

    <!-- Payment info -->
    <div style="border-top:1px solid #f1f5f9;padding-top:20px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;font-size:12px;color:#64748b;">
      <div>
        <strong style="color:#0f172a;">Payment Method:</strong> Thawani Pay
      </div>
      <div style="font-family:monospace;font-size:11px;">
        Ref: {transaction_id[:16]}
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#0f172a;color:#94a3b8;padding:24px 32px;border-radius:0 0 16px 16px;font-size:12px;line-height:1.6;">
    <p style="margin:0 0 8px;color:#fff;font-weight:600;">Thank you for subscribing!</p>
    <p style="margin:0;">Need help? Reply to this email or visit <a href="https://letsm.ai" style="color:#06b6d4;text-decoration:none;">letsm.ai</a>.</p>
    <p style="margin:12px 0 0;font-size:11px;opacity:0.7;">Let's M AI · letsm.ai · Sultanate of Oman</p>
  </div>
</div>
</body></html>"""


async def send_subscription_invoice_email(
    *,
    customer_email: str,
    customer_name: str,
    plan_label: str,
    billing_cycle: str,
    total_omr: float,
    paid_at: datetime,
    expires_at: datetime,
    transaction_id: str,
) -> Optional[str]:
    """Sends an invoice email via Resend. Returns the invoice number on success,
    None on failure. Failure does NOT block subscription activation."""
    if not _db_module.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping invoice email")
        return None

    invoice_number = f"LM-{paid_at.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    amounts = _split_vat(total_omr)

    html = _build_invoice_html(
        invoice_number=invoice_number,
        customer_name=customer_name or customer_email.split("@")[0],
        customer_email=customer_email,
        plan_label=plan_label,
        billing_cycle=billing_cycle,
        paid_at=paid_at,
        expires_at=expires_at,
        amounts=amounts,
        transaction_id=transaction_id,
    )

    try:
        resend.api_key = _db_module.RESEND_API_KEY
        resend.Emails.send({
            "from": f"Let's M AI <{_db_module.SENDER_EMAIL}>",
            "to": [customer_email],
            "subject": f"Invoice {invoice_number} — Let's M AI {plan_label}",
            "html": html,
        })
        logger.info(f"Invoice {invoice_number} sent to {customer_email}")
        return invoice_number
    except Exception as e:
        logger.error(f"Failed to send invoice email to {customer_email}: {e}")
        return None


def build_invoice_record(
    *,
    invoice_number: str,
    user_id: str,
    customer_email: str,
    plan_id: str,
    plan_label: str,
    billing_cycle: str,
    total_omr: float,
    paid_at: datetime,
    expires_at: datetime,
    transaction_id: str,
    session_id: str,
) -> dict:
    """Returns a Mongo-ready dict for the invoices collection."""
    amounts = _split_vat(total_omr)
    return {
        "invoice_number": invoice_number,
        "user_id": user_id,
        "customer_email": customer_email,
        "plan_id": plan_id,
        "plan_label": plan_label,
        "billing_cycle": billing_cycle,
        "amount_net_omr": amounts["net"],
        "amount_vat_omr": amounts["vat"],
        "amount_total_omr": amounts["total"],
        "vat_rate": OMAN_VAT_RATE,
        "currency": "OMR",
        "provider": "thawani",
        "transaction_id": transaction_id,
        "session_id": session_id,
        "paid_at": paid_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
