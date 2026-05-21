from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Thawani Pay Config (Omani payment gateway)
THAWANI_SECRET_KEY = os.environ.get('THAWANI_SECRET_KEY')
THAWANI_PUBLIC_KEY = os.environ.get('THAWANI_PUBLIC_KEY')
# Use sandbox by default; set THAWANI_MODE=live in production .env
THAWANI_MODE = os.environ.get('THAWANI_MODE', 'live')
THAWANI_BASE_URL = (
    'https://checkout.thawani.om/api/v1'
    if THAWANI_MODE == 'live'
    else 'https://uatcheckout.thawani.om/api/v1'
)
THAWANI_PAY_URL = (
    'https://checkout.thawani.om/pay'
    if THAWANI_MODE == 'live'
    else 'https://uatcheckout.thawani.om/pay'
)

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Subscription Plans
# Prices are stored in OMR. For Thawani we convert to baisas (1 OMR = 1000 baisas).
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "name_ar": "مجاني",
        "price": 0.00,
        "price_yearly": 0.00,
        "currency": "omr",
        "features": ["10 Messages/day", "5 Active Tasks", "Basic Reminders", "Email Support"],
        "features_ar": ["10 رسائل/يوم", "5 مهام نشطة", "تذكيرات أساسية", "دعم بالبريد"],
        "limits": {"max_tasks": 5, "max_messages_daily": 10}
    },
    "pro": {
        "name": "Pro",
        "name_ar": "برو",
        "price": 20.00,
        "price_yearly": 200.00,  # 2 months free
        "currency": "omr",
        "features": ["Unlimited Messages", "Unlimited Tasks", "Voice Input", "Advanced Analytics", "Priority Support"],
        "features_ar": ["رسائل غير محدودة", "مهام غير محدودة", "إدخال صوتي", "تحليلات متقدمة", "دعم أولوية"],
        "limits": {"max_tasks": -1, "max_messages_daily": 500}
    },
    "business": {
        "name": "Business",
        "name_ar": "بزنس",
        "price": 50.00,
        "price_yearly": 500.00,  # 2 months free
        "currency": "omr",
        "features": ["All Pro Features", "WhatsApp Integration", "Team up to 10", "Custom API", "Account Manager"],
        "features_ar": ["كل مميزات برو", "تكامل واتساب", "فريق حتى 10", "API مخصص", "مدير حساب"],
        "limits": {"max_tasks": -1, "max_messages_daily": 500}
    }
}
