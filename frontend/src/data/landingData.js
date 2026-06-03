// Static data for the Landing page — kept in a separate file to keep Landing.js readable.
// `t` is the translation helper (en, ar) => string.
import {
  ChatTeardrop, Calendar, ShieldCheck, Brain, Clock, Lightning, Microphone, Image,
  Lightbulb, ChartBar, ArrowsClockwise, BellSimple, Sparkle, Translate,
  WhatsappLogo, TelegramLogo, ChatCircle, Lock, Eye, UserCheck, FileText,
} from '@phosphor-icons/react';

export const buildHeroPills = (t) => [
  { icon: ChatTeardrop, label: t('Natural Language', 'لغة طبيعية'), cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  { icon: Calendar, label: t('Smart Scheduling', 'جدولة ذكية'), cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  { icon: Brain, label: t('Context-Aware', 'وعي سياقي'), cls: 'bg-pink-50 text-pink-600 border-pink-200' },
  { icon: ShieldCheck, label: t('Privacy-First', 'الخصوصية أولاً'), cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
];

export const buildFeatures = (t) => [
  { icon: ChatTeardrop, title: t('Natural Language Understanding', 'فهم اللغة الطبيعية'), desc: t('Talk naturally. Letsm AI understands casual language, vague time expressions, and multilingual input.', 'تحدث بشكل طبيعي. يفهم Letsm AI اللغة العامية والتعبيرات الزمنية والإدخال متعدد اللغات.'), color: 'bg-purple-50 text-purple-600' },
  { icon: Clock, title: t('Smart Task Management', 'إدارة ذكية للمهام'), desc: t('Create, edit, and manage tasks, reminders, and recurring events with simple commands.', 'أنشئ وعدّل وأدِر المهام والتذكيرات بأوامر بسيطة.'), color: 'bg-blue-50 text-blue-600' },
  { icon: Calendar, title: t('Calendar Integration', 'تكامل التقويم'), desc: t('Sync with Google, Outlook, and Apple Calendar. Check availability and schedule meetings effortlessly.', 'زامن مع تقويم Google وOutlook. تحقق من التوفر وجدول الاجتماعات بسهولة.'), color: 'bg-sky-50 text-sky-600' },
  { icon: Microphone, title: t('Voice Intelligence', 'ذكاء صوتي'), desc: t('Send voice notes and let AI transcribe and create tasks automatically from your spoken words.', 'أرسل ملاحظات صوتية ودع الذكاء الاصطناعي يحولها وينشئ مهام تلقائياً.'), color: 'bg-pink-50 text-pink-600' },
  { icon: Image, title: t('Media Analysis', 'تحليل الوسائط'), desc: t('Upload bills, receipts, or documents. AI extracts dates, amounts, and suggests relevant reminders.', 'ارفع الفواتير أو المستندات. يستخرج الذكاء الاصطناعي التواريخ والمبالغ ويقترح تذكيرات.'), color: 'bg-amber-50 text-amber-600' },
  { icon: Lightning, title: t('Priority Detection', 'كشف الأولويات'), desc: t('AI automatically identifies urgent tasks based on deadlines, language, and context.', 'يحدد الذكاء الاصطناعي المهام العاجلة تلقائياً بناءً على المواعيد والسياق.'), color: 'bg-emerald-50 text-emerald-600' },
];

export const buildAdvancedFeatures = (t) => [
  { icon: Lightbulb, title: t('Contextual Suggestions', 'اقتراحات سياقية'), desc: t('AI detects related actions and suggests follow-ups automatically.', 'يكتشف الذكاء الاصطناعي الإجراءات المرتبطة ويقترح متابعات تلقائياً.') },
  { icon: ChartBar, title: t('Productivity Insights', 'رؤى الإنتاجية'), desc: t('Analyze patterns and get personalized recommendations.', 'حلل الأنماط واحصل على توصيات مخصصة.') },
  { icon: ArrowsClockwise, title: t('Cross-Task Linking', 'ربط المهام'), desc: t('Connect related tasks into workflows and sequences.', 'اربط المهام المتعلقة في تسلسلات عمل.') },
  { icon: BellSimple, title: t('Smart Follow-Ups', 'متابعات ذكية'), desc: t('Gentle nudges for overdue tasks with rescheduling suggestions.', 'تنبيهات لطيفة للمهام المتأخرة مع اقتراحات لإعادة الجدولة.') },
  { icon: Sparkle, title: t('Proactive Assistance', 'مساعدة استباقية'), desc: t('AI suggests reminders when it detects implied intent.', 'يقترح الذكاء الاصطناعي تذكيرات عندما يكتشف نية ضمنية.') },
  { icon: Translate, title: t('Multilingual Support', 'دعم متعدد اللغات'), desc: t('Communicate in your preferred language naturally.', 'تواصل بلغتك المفضلة بشكل طبيعي.') },
];

export const buildConversations = (t) => [
  {
    messages: [
      { role: 'user', text: t('Remind me to send the report after lunch', 'ذكرني بإرسال التقرير بعد الغداء') },
      { role: 'ai', text: t('Sure — would 2pm work for you?', 'بالتأكيد — هل الساعة 2 ظهراً مناسبة؟') },
      { role: 'user', text: t('Yes', 'نعم') },
      { role: 'ai', text: t("Done! I'll remind you at 2pm.", 'تم! سأذكرك الساعة 2 ظهراً.') },
    ],
    action: t('Reminder set for 2:00 PM today', 'تم تعيين التذكير للساعة 2:00 مساءً'),
  },
  {
    messages: [
      { role: 'user', text: t('Voice: Tell me to call Ahmed before my flight', 'صوت: ذكرني بالاتصال بأحمد قبل رحلتي') },
      { role: 'ai', text: t("Got it. I'll remind you 2 hours before your flight.", 'حسناً. سأذكرك قبل رحلتك بساعتين.') },
    ],
    action: t('Reminder set for 2 hours before flight', 'تم تعيين التذكير قبل الرحلة بساعتين'),
  },
  {
    messages: [
      { role: 'user', text: t('I keep forgetting my weekly meeting', 'أنسى اجتماعي الأسبوعي دائماً') },
      { role: 'ai', text: t('I noticed it happens Mondays at 9am. Want me to set a recurring reminder?', 'لاحظت أنه يوم الاثنين الساعة 9. هل تريد تذكيراً متكرراً؟') },
      { role: 'user', text: t('Yes please', 'نعم من فضلك') },
      { role: 'ai', text: t("Done! You'll get a reminder every Monday at 8:45am.", 'تم! ستحصل على تذكير كل اثنين الساعة 8:45 صباحاً.') },
    ],
    action: t('Recurring reminder created', 'تم إنشاء تذكير متكرر'),
  },
  {
    messages: [
      { role: 'user', text: t('Image: [Uploaded electricity bill]', 'صورة: [فاتورة كهرباء]') },
      { role: 'ai', text: t('I see this bill is due on January 15th. Should I remind you a few days before?', 'أرى أن الفاتورة مستحقة في 15 يناير. هل أذكرك قبلها بأيام؟') },
      { role: 'user', text: t('Yes, 3 days before', 'نعم، قبل 3 أيام') },
      { role: 'ai', text: t("Perfect! I'll remind you on January 12th.", 'ممتاز! سأذكرك في 12 يناير.') },
    ],
    action: t('Bill reminder set for Jan 12', 'تم تعيين تذكير الفاتورة ليوم 12 يناير'),
  },
];

export const buildDemoScenarios = (t) => [
  { label: t('Set a Reminder', 'تعيين تذكير'), icon: Clock, user: t('Remind me to send the report after lunch', 'ذكرني بإرسال التقرير بعد الغداء'), ai: t('Sure! Would 2pm work for you?', 'بالتأكيد! هل الساعة 2 ظهراً مناسبة؟'), follow: t('Yes', 'نعم'), final: t("Done! I'll remind you at 2pm today.", 'تم! سأذكرك الساعة 2 ظهراً اليوم.'), action: t('Reminder set for 2:00 PM', 'تم تعيين التذكير للساعة 2:00 مساءً') },
  { label: t('Voice Command', 'أمر صوتي'), icon: Microphone, user: t('Voice: Tell me to call Ahmed before my flight', 'صوت: ذكرني بالاتصال بأحمد قبل رحلتي'), ai: t("Got it. When is your flight?", 'حسناً. متى رحلتك؟'), follow: t('Tomorrow at 5pm', 'غداً الساعة 5 مساءً'), final: t("I'll remind you to call Ahmed at 3pm tomorrow.", 'سأذكرك بالاتصال بأحمد الساعة 3 مساءً غداً.'), action: t('Reminder set for tomorrow 3:00 PM', 'تم تعيين التذكير لغداً 3:00 مساءً') },
  { label: t('Recurring Event', 'حدث متكرر'), icon: Calendar, user: t('I keep forgetting my weekly meeting', 'أنسى اجتماعي الأسبوعي'), ai: t('I noticed it happens Mondays at 9am. Want a recurring reminder?', 'لاحظت أنه يوم الاثنين الساعة 9. هل تريد تذكيراً متكرراً؟'), follow: t('Yes please', 'نعم من فضلك'), final: t("Done! Reminder every Monday at 8:45am.", 'تم! تذكير كل اثنين الساعة 8:45 صباحاً.'), action: t('Recurring reminder created', 'تم إنشاء تذكير متكرر') },
];

export const buildTestimonials = (t) => [
  { name: 'Sarah Chen', role: t('Product Manager at TechCorp', 'مديرة منتجات في TechCorp'), initials: 'SC', bg: 'from-green-400 to-emerald-500', quote: t('Letsm AI completely changed how I manage my day. I just text it naturally and everything gets organized. It\'s like having a personal secretary in my pocket.', 'Letsm AI غيّر تماماً طريقة إدارة يومي.') },
  { name: 'Ahmed Al-Rashid', role: t('Freelance Designer', 'مصمم مستقل'), initials: 'AR', bg: 'from-violet-400 to-purple-500', quote: t('The voice note feature is incredible. I record my thoughts while driving and come back to perfectly organized tasks. Game changer!', 'ميزة الملاحظات الصوتية رائعة.') },
  { name: 'Maria Rodriguez', role: t('Marketing Director at GrowthLab', 'مديرة تسويق في GrowthLab'), initials: 'MR', bg: 'from-pink-400 to-rose-500', quote: t('Our entire team uses Letsm AI now. The calendar integration alone saved us hours of back-and-forth scheduling every week.', 'فريقنا بالكامل يستخدم Letsm AI.') },
  { name: 'James Wilson', role: t('Software Engineer at DevStudio', 'مهندس برمجيات في DevStudio'), initials: 'JW', bg: 'from-amber-400 to-orange-500', quote: t('I was skeptical about AI assistants, but Letsm actually understands context. It remembered I always have standup at 9am and auto-suggests prep reminders.', 'كنت متشككاً، لكن Letsm يفهم السياق فعلاً.') },
  { name: 'Priya Sharma', role: t('Entrepreneur at StartupHub', 'رائدة أعمال في StartupHub'), initials: 'PS', bg: 'from-blue-400 to-cyan-500', quote: t('The bill scanning feature saved me from missing a payment deadline. Just snapped a photo and it set up the reminder automatically.', 'ميزة مسح الفواتير أنقذتني.') },
  { name: 'Tom Baker', role: t('Operations Manager at LogiFlow', 'مدير عمليات في LogiFlow'), initials: 'TB', bg: 'from-teal-400 to-green-500', quote: t("Privacy was my biggest concern, but Letsm's zero-knowledge architecture gave me confidence. Great product with great principles.", 'الخصوصية كانت قلقي الأكبر.') },
];

export const buildPrivacyFeatures = (t) => [
  { icon: ShieldCheck, title: t('End-to-End Encryption', 'تشفير شامل'), desc: t('All your data is encrypted in transit and at rest using industry-standard protocols.', 'جميع بياناتك مشفرة أثناء النقل والتخزين.') },
  { icon: Lock, title: t('Zero-Knowledge Architecture', 'بنية معرفة صفرية'), desc: t("We can't access your personal data. Only you have the keys to your information.", 'لا يمكننا الوصول لبياناتك. أنت فقط من يملك المفتاح.') },
  { icon: Eye, title: t('Transparent Data Usage', 'استخدام بيانات شفاف'), desc: t('Clear visibility into what data we collect and how it\'s used to improve your experience.', 'رؤية واضحة لما نجمعه وكيف نستخدمه.') },
  { icon: UserCheck, title: t('User Control', 'تحكم المستخدم'), desc: t('Full control over your data. Export, delete, or modify your information anytime.', 'تحكم كامل في بياناتك.') },
  { icon: FileText, title: t('GDPR & CCPA Compliant', 'متوافق مع GDPR'), desc: t('We comply with international privacy regulations to protect your rights.', 'نلتزم بلوائح الخصوصية الدولية.') },
  { icon: ShieldCheck, title: t('Minimal Data Collection', 'جمع بيانات أدنى'), desc: t('We only store what\'s necessary to provide the service. No unnecessary tracking.', 'نخزن فقط ما هو ضروري لتقديم الخدمة.') },
];

export const buildFaqs = (t) => [
  { q: t('Can I change plans later?', 'هل يمكنني تغيير الخطة لاحقاً؟'), a: t('Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.', 'نعم! يمكنك ترقية أو تخفيض خطتك في أي وقت.') },
  { q: t('Is there a free trial?', 'هل هناك فترة تجريبية مجانية؟'), a: t('Yes, Pro and Business plans come with a 14-day free trial. No credit card required.', 'نعم، خطط Pro وBusiness تأتي مع تجربة مجانية لمدة 14 يوماً.') },
  { q: t('How does WhatsApp integration work?', 'كيف يعمل تكامل واتساب؟'), a: t("After signing up, you'll receive a QR code to scan with WhatsApp. The AI will then be available in your chats.", 'بعد التسجيل، ستحصل على رمز QR لمسحه بواتساب.') },
  { q: t('What payment methods do you accept?', 'ما طرق الدفع المقبولة؟'), a: t('We accept all major credit cards and debit cards through our secure payment processor Stripe.', 'نقبل جميع بطاقات الائتمان والخصم عبر Stripe.') },
];

export const buildMessagingIntegrations = (t) => [
  { name: 'WhatsApp', icon: WhatsappLogo, available: true },
  { name: 'Telegram', icon: TelegramLogo, available: true },
  { name: t('Web Chat', 'محادثة الويب'), icon: ChatCircle, available: true },
  { name: 'Slack', icon: ChatTeardrop, available: false },
];

export const buildCalendarIntegrations = () => [
  { name: 'Google Calendar', available: true },
  { name: 'Outlook', available: true },
  { name: 'Apple Calendar', available: true },
  { name: 'Microsoft 365', available: false },
];

export const buildPlans = (t) => [
  { name: t('Free', 'مجاني'), price: '0', period: t(' OMR', ' ر.ع'), desc: t('Perfect for trying Letsm AI', 'مثالي لتجربة Letsm AI'), features: ['10 Messages/day', '5 Active Tasks', 'Basic Reminders', 'Email Support'], cta: t('Start Free', 'ابدأ مجاناً'), pop: false },
  { name: t('Pro', 'برو'), price: '20', period: t(' OMR/mo', ' ر.ع/شهرياً'), desc: t('For individuals who want more', 'للأفراد الذين يريدون المزيد'), features: ['Unlimited Messages', 'Unlimited Tasks', 'Voice Input', 'Advanced Analytics', 'Priority Support', 'Unlimited History'], cta: t('Subscribe Now', 'اشترك الآن'), pop: true },
  { name: t('Business', 'بزنس'), price: '50', period: t(' OMR/mo', ' ر.ع/شهرياً'), desc: t('For teams and power users', 'للفرق والمستخدمين المتقدمين'), features: ['All Pro Features', 'WhatsApp Integration', 'Team up to 10', 'Custom API', 'Account Manager', 'Advanced Analytics'], cta: t('Start Business Trial', 'ابدأ تجربة الأعمال'), pop: false },
];

export const HERO_IMAGE = "https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/c20506ad820af18fca8db646421f81d14372424f9f9dfdbec4992513f7a1d9d2.png";
export const PRIVACY_IMAGE = "https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/1a6effa70f08b0d092ef06acba1df41da507e959eb51219376efad3b1f340fe8.png";
