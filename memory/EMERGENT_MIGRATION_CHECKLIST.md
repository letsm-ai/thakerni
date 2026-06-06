# Letsm AI — Migration Checklist (Hostinger → Emergent Hosting)

## ✅ المرحلة 1: التحضير الفني (مكتمل ✓)

تمت إزالة الأشياء التالية من الكود:
- ✅ مجلد `/whatsapp-service` (Baileys Node.js)
- ✅ صفحة `frontend/src/pages/WhatsApp.js` (واجهة QR القديمة)
- ✅ Route `/dashboard/whatsapp` من `App.js`
- ✅ Endpoints الـ Baileys من `backend/routes/services.py`
- ✅ `whatsappApi` من `frontend/src/lib/api.js`

النظام الجديد المُعتمد:
- ✅ `backend/routes/whatsapp_cloud.py` — Meta Cloud API webhook + AI replies + linking
- ✅ `frontend/src/pages/WhatsAppLink.js` — UI لربط واتساب بالكود

---

## 📋 المرحلة 2: قبل الضغط على Deploy في Emergent

### قائمة المتغيرات البيئية (Environment Variables)

عند ضغط Deploy، Emergent سيطلب منك إضافة هذي المتغيرات. اجمعها من VPS الحالي:

#### 🔑 Authentication & Security
```
JWT_SECRET_KEY=...      # من /opt/letsm/.env على VPS
```

#### 🗄️ Database
```
MONGO_URL=...           # ⚠️ مهم: راجع قسم MongoDB أدناه
DB_NAME=letsm
```

#### 🤖 AI / LLM
```
OPENAI_API_KEY=sk-proj-...     # ⚠️ ولّد مفتاحاً جديداً (القديم انكشف)
EMERGENT_LLM_KEY=sk-emergent-...  # متوفر من Emergent تلقائياً
```

#### 📧 Email (Resend)
```
RESEND_API_KEY=re_...
SENDER_EMAIL=support@letsm.ai
```

#### 💳 Payments
```
THAWANI_SECRET_KEY=...
THAWANI_PUBLIC_KEY=...
THAWANI_MODE=live
STRIPE_API_KEY=...      # اختياري — حالياً مخفي
```

#### 📱 WhatsApp Cloud API (Meta)
```
META_WEBHOOK_VERIFY_TOKEN=i9l2acNBCnIvB5XR21cijzwvdbafZhF2bK8qNlQvoJo
META_APP_SECRET=...     # ⚠️ ولّد جديداً
META_PERMANENT_ACCESS_TOKEN=...  # ⚠️ ولّد جديداً
META_PHONE_NUMBER_ID=1195520376971036
META_WHATSAPP_BUSINESS_ACCOUNT_ID=
META_BUSINESS_DISPLAY_NUMBER=+968 7154 7480
```

#### 🌐 Frontend Config
```
REACT_APP_BACKEND_URL=  # سيُعيَّن تلقائياً من Emergent بعد Deploy
FRONTEND_URL=https://letsm.ai
```

#### 🔄 Misc
```
CORS_ORIGINS=https://letsm.ai,https://www.letsm.ai
TZ=Asia/Muscat
```

---

## 🗄️ خيارات MongoDB

اخترت **(ب) MongoDB Atlas** (موصى به):

### خطوات النقل لـ Atlas:
1. أنشئ حساب مجاني على https://cloud.mongodb.com
2. أنشئ Cluster (Free Tier — M0):
   - Region: اختر الأقرب لـ Emergent (ربما us-east أو eu-west)
   - اسم الـ Cluster: `letsm-prod`
3. Database Access → Add User: اسم + باسورد قوي → احفظهم
4. Network Access → Add IP → اختر "Allow Access from Anywhere" (0.0.0.0/0) للبداية
5. اضغط Connect → Drivers → انسخ connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@letsm-prod.xxxx.mongodb.net/letsm?retryWrites=true&w=majority
   ```

### نقل البيانات من VPS إلى Atlas:
```bash
# على VPS (SSH):
docker exec letsm_mongo mongodump --uri="mongodb://root:PASS@localhost:27017/letsm?authSource=admin" --out=/tmp/backup
docker cp letsm_mongo:/tmp/backup ./backup
tar czf letsm-mongo-backup.tar.gz backup/

# ثم على جهازك المحلي:
scp root@srv1640063:/root/letsm-mongo-backup.tar.gz .
tar xzf letsm-mongo-backup.tar.gz

# استورد إلى Atlas:
mongorestore --uri="mongodb+srv://USERNAME:PASSWORD@letsm-prod.xxx.mongodb.net" --nsInclude="letsm.*" backup/letsm
```

---

## 🚀 المرحلة 3: Deploy على Emergent

### الخطوات:
1. **افتح Emergent في المتصفح** على هذا المشروع
2. **اضغط زر "Deploy"** في الأعلى
3. **أدخل المتغيرات** أعلاه (انسخ من VPS أو ولّد جديدة)
4. **انتظر اكتمال البناء** (10-15 دقيقة)
5. **ستحصل على URL مؤقت** مثل `letsm-ai.preview.emergentagent.com`

### اختبار قبل DNS:
- ✅ صفحة Landing تفتح
- ✅ تسجيل دخول يعمل
- ✅ AI Chat يرد
- ✅ Subscription page تفتح
- ⚠️ WhatsApp webhook **لن يعمل** على URL المؤقت حتى نربط النطاق

---

## 🌐 المرحلة 4: ربط النطاق letsm.ai

1. في Emergent → **Link Domain** → أدخل `letsm.ai`
2. Emergent سيعطيك سجلات DNS (Entri / Cloudflare)
3. **في Hostinger DNS Panel:**
   - احذف **جميع** A records الحالية
   - أضف الـ A records الجديدة من Emergent
4. انتظر انتشار DNS (5-60 دقيقة عادةً)
5. تحقق: `dig letsm.ai +short` (يُرجع IP الجديد)

---

## 🔗 المرحلة 5: تحديث Meta Webhook

⚠️ بعد ما DNS ينتشر:

1. افتح Meta Developer Console → WhatsApp → Configuration
2. **الـ Callback URL يبقى نفسه:** `https://letsm.ai/api/whatsapp/cloud/webhook`
   - لكن Meta يحتاج "إعادة تحقق" (Refresh) لأن السيرفر تغير
3. اضغط **Edit** → **Verify and Save** (مع نفس Verify Token)
4. تأكد أن webhook field `messages` لا يزال subscribed ✅

---

## 🧪 المرحلة 6: الاختبارات النهائية

اختبر بالترتيب:
- [ ] فتح https://letsm.ai → الصفحة الرئيسية تظهر
- [ ] تسجيل دخول بمستخدم موجود
- [ ] إنشاء مهمة جديدة
- [ ] محادثة الـ AI
- [ ] فتح /dashboard/whatsapp-link → توليد كود
- [ ] إرسال الكود من واتساب الشخصي إلى +968 7154 7480
- [ ] التحقق من ظهور "✅ تم الربط" + ظهور الرسالة في `/admin/whatsapp`
- [ ] رسالة عادية بعد الربط → الـ AI يرد بمعرفة الاسم
- [ ] دفعة اختبار (Thawani Pay)
- [ ] إرسال weekly digest يدوياً (من Profile)

---

## 🛟 المرحلة 7: الاحتياطات

- ✅ **لا تحذف VPS Hostinger** لمدة أسبوعين
- ✅ خذ نسخة احتياطية من MongoDB Atlas يومياً (Atlas يفعلها تلقائياً)
- ✅ راقب Sentry (إذا فُعّل) لأي أخطاء جديدة
- ✅ راقب Emergent Logs أول 48 ساعة
- ✅ Rollback: إذا حدثت كارثة، أرجع DNS إلى Hostinger IP خلال دقائق

---

## 🔴 تذكير أمني عاجل قبل النشر النهائي

**كل المفاتيح التي تم مشاركتها سابقاً يجب تجديدها** (للأمان):

| المفتاح | كيف تجدّده |
|---|---|
| OPENAI_API_KEY | platform.openai.com/api-keys → Revoke → Create new |
| META_APP_SECRET | Meta App → Settings → Basic → Reset |
| META_PERMANENT_ACCESS_TOKEN | business.facebook.com/settings → System Users → Generate New Token |
| GHCR_PULL_TOKEN | github.com/settings/tokens → Revoke (لن نحتاجه على Emergent) |

---

## 💰 التكلفة المتوقعة على Emergent

- **Hosting**: 50 credits/شهر (~$10)
- **Custom Domain**: مجاني
- **MongoDB Atlas Free Tier**: مجاني (حتى 512MB)
- **Total**: ~$10/شهر

مقارنة بـ Hostinger VPS الحالي + التكاليف الإضافية للوقت في الصيانة.

---

## ▶️ ابدأ الآن

اضغط زر **Deploy** في Emergent → اتبع الخطوات أعلاه بالترتيب 🚀
