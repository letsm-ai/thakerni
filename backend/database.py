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

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "price": 0.00,
        "currency": "usd",
        "features": ["5 Active Tasks", "3 Conversations/day", "Basic Reminders", "Email Support"],
        "limits": {"max_tasks": 5, "max_conversations_daily": 3}
    },
    "pro": {
        "name": "Pro",
        "price": 9.99,
        "currency": "usd",
        "features": ["Unlimited Tasks", "Unlimited Conversations", "Voice Input", "Advanced Analytics", "Priority Support"],
        "limits": {"max_tasks": -1, "max_conversations_daily": -1}
    },
    "business": {
        "name": "Business",
        "price": 29.99,
        "currency": "usd",
        "features": ["All Pro Features", "WhatsApp Integration", "Team up to 10", "Custom API", "Account Manager"],
        "limits": {"max_tasks": -1, "max_conversations_daily": -1}
    }
}
