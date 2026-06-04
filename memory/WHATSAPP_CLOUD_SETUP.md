# WhatsApp Cloud API — Quick Setup Guide

You now have an admin panel at `/admin/whatsapp` to manage your AI assistant's WhatsApp number directly via Meta Cloud API — **no phone QR scan required**.

## Step 1 — Create a Meta App (one-time)

1. Go to https://developers.facebook.com/apps and click **Create App**.
2. Choose type: **Business**.
3. App name: `Letsm AI Assistant` · Business account: (your Meta Business account).
4. After creation, on the dashboard click **Add Product → WhatsApp → Set up**.

## Step 2 — Register / Pick the assistant's phone number

In WhatsApp → **API Setup**:
- **Option A:** Use the free Meta-issued test number (great for development; limited recipients).
- **Option B:** Click **Add phone number** and register your existing number (production-ready, unlimited).
  - Meta will verify it via SMS/call.
  - Important: This number must NOT be in active use on the WhatsApp mobile app. If it is, you must first delete the WhatsApp account on the phone.

After registration, copy these two values from the API Setup page:
- `Phone number ID` (15-digit number)
- A **Temporary Access Token** (valid 24 hours — fine for first test)

## Step 3 — Generate a Permanent Access Token (recommended)

The temp token expires in 24 hours. For production, create a System User token:

1. Go to https://business.facebook.com/settings → **Users → System Users → Add**.
2. Create a System User: name `Letsm AI System`, role **Admin**.
3. Click **Add Assets → Apps → select your app → Full Control**.
4. Click **Generate New Token**:
   - App: select your Letsm AI app
   - Permissions: tick `whatsapp_business_messaging` + `whatsapp_business_management`
   - Token expiration: **Never**
5. Copy the token (it starts with `EAA...`). **Save it now — Meta won't show it again.**

## Step 4 — Configure the Webhook

In WhatsApp → **Configuration → Webhook → Edit**:
- **Callback URL:** `https://letsm.ai/api/whatsapp/cloud/webhook`
- **Verify Token:** any random secret string you choose (e.g. `letsm_wh_2026_x9k2`). Save it — you'll add to .env.
- Click **Verify and Save**. (If it fails, the backend ENV `META_WEBHOOK_VERIFY_TOKEN` must match this exact string.)
- Subscribe to webhook field: **messages** ✅

## Step 5 — Get the App Secret

In your Meta app → **Settings → Basic** → **App Secret → Show** → copy.

## Step 6 — Add 4 env vars to the VPS

SSH into the VPS and edit `/path/to/letsm/backend/.env` (or wherever your compose file maps `.env` from):

```bash
META_WEBHOOK_VERIFY_TOKEN=letsm_wh_2026_x9k2          # exactly what you set in step 4
META_APP_SECRET=<from step 5>
META_PERMANENT_ACCESS_TOKEN=<EAA...from step 3>
META_PHONE_NUMBER_ID=<from step 2>
```

Then restart the backend container:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

## Step 7 — Verify in Admin Panel

Open https://letsm.ai/admin/whatsapp and click **Refresh**. You should see:
- ✅ Webhook Verify Token
- ✅ App Secret
- ✅ Permanent Access Token
- ✅ Phone Number ID
- Green banner: "Configuration complete — ready to operate!"

## Step 8 — Send a test message

From the admin panel:
1. **To:** your personal phone in E.164 format (e.g. `96812345678` — country code + number, no `+` or spaces).
2. **Message body:** "Hello from Let's M AI!"
3. Click **Send**.

⚠️ **Important Meta restriction:** In the first 24 hours after registering a number (or while using the Meta test number), you can only send to phone numbers you've **added as recipients** in the API Setup page. After 24 hours of active usage, this restriction lifts.

## How auto-reply works

- Customers send a WhatsApp message → reaches your registered number.
- Meta forwards it to `/api/whatsapp/cloud/webhook` (validated via HMAC signature).
- Backend stores it in `whatsapp_cloud_messages` collection.
- If **Auto-Reply** is ON in the admin panel, GPT-4o-mini generates a contextual reply in the same language and sends it back via Cloud API.
- All messages (incoming + outgoing) are visible in the admin panel.

## Cost notes

- First 1,000 conversations/month per WhatsApp Business Account are **free**.
- After that, conversation-based pricing applies (~$0.005–$0.07 per conversation, depending on country and category). Check https://developers.facebook.com/docs/whatsapp/pricing.
- Meta charges per **24-hour conversation window**, not per message — so the same user can send many messages within a window for one charge.

## Troubleshooting

- **Webhook verification fails (red badge in Meta):** the verify token in .env doesn't match the one you typed in Meta. Re-check spelling.
- **Messages go in but no AI reply:** check Auto-Reply toggle is ON. Then check `/admin/whatsapp` for the inbound message — if it's there but no outbound, look at backend logs for the AI error.
- **"Cannot send to this number":** Meta test mode restriction. Add the recipient phone in API Setup → Recipients, or wait for production approval.
- **"Invalid signature" 401:** the `META_APP_SECRET` is wrong. Re-copy from Meta App → Settings → Basic.
