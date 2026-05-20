import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import FloatingChat from '../components/FloatingChat';
import {
  ArrowRight, Play, ChatTeardrop, Calendar, ShieldCheck, Brain, Check,
  Star, Lightning, Globe, CheckCircle, Clock, Sparkle, Microphone,
  WhatsappLogo, TelegramLogo, ChatCircle, Lock, Eye, UserCheck,
  FileText, PaperPlaneTilt, CaretRight, X, ChartBar, Lightbulb,
  ArrowsClockwise, BellSimple, Translate, Image, List, ArrowUp
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const Landing = () => {
  const { language, toggleLanguage, isRTL } = useLanguage();
  const t = useCallback((en, ar) => language === 'ar' ? ar : en, [language]);

  // Simple markdown: **bold** → <strong>
  const renderMd = (text) => {
    if (!text) return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={`b${i}`}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  // ── Feature pills for hero ──
  const heroPills = [
    { icon: ChatTeardrop, label: t('Natural Language', 'لغة طبيعية'), cls: 'bg-purple-50 text-purple-600 border-purple-200' },
    { icon: Calendar, label: t('Smart Scheduling', 'جدولة ذكية'), cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    { icon: Brain, label: t('Context-Aware', 'وعي سياقي'), cls: 'bg-pink-50 text-pink-600 border-pink-200' },
    { icon: ShieldCheck, label: t('Privacy-First', 'الخصوصية أولاً'), cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  ];

  // ── Features (6 cards) ──
  const features = [
    { icon: ChatTeardrop, title: t('Natural Language Understanding', 'فهم اللغة الطبيعية'), desc: t('Talk naturally. Letsm AI understands casual language, vague time expressions, and multilingual input.', 'تحدث بشكل طبيعي. يفهم Letsm AI اللغة العامية والتعبيرات الزمنية والإدخال متعدد اللغات.'), color: 'bg-purple-50 text-purple-600' },
    { icon: Clock, title: t('Smart Task Management', 'إدارة ذكية للمهام'), desc: t('Create, edit, and manage tasks, reminders, and recurring events with simple commands.', 'أنشئ وعدّل وأدِر المهام والتذكيرات بأوامر بسيطة.'), color: 'bg-blue-50 text-blue-600' },
    { icon: Calendar, title: t('Calendar Integration', 'تكامل التقويم'), desc: t('Sync with Google, Outlook, and Apple Calendar. Check availability and schedule meetings effortlessly.', 'زامن مع تقويم Google وOutlook. تحقق من التوفر وجدول الاجتماعات بسهولة.'), color: 'bg-sky-50 text-sky-600' },
    { icon: Microphone, title: t('Voice Intelligence', 'ذكاء صوتي'), desc: t('Send voice notes and let AI transcribe and create tasks automatically from your spoken words.', 'أرسل ملاحظات صوتية ودع الذكاء الاصطناعي يحولها وينشئ مهام تلقائياً.'), color: 'bg-pink-50 text-pink-600' },
    { icon: Image, title: t('Media Analysis', 'تحليل الوسائط'), desc: t('Upload bills, receipts, or documents. AI extracts dates, amounts, and suggests relevant reminders.', 'ارفع الفواتير أو المستندات. يستخرج الذكاء الاصطناعي التواريخ والمبالغ ويقترح تذكيرات.'), color: 'bg-amber-50 text-amber-600' },
    { icon: Lightning, title: t('Priority Detection', 'كشف الأولويات'), desc: t('AI automatically identifies urgent tasks based on deadlines, language, and context.', 'يحدد الذكاء الاصطناعي المهام العاجلة تلقائياً بناءً على المواعيد والسياق.'), color: 'bg-emerald-50 text-emerald-600' },
  ];

  // ── Advanced Features (6 cards) ──
  const advancedFeatures = [
    { icon: Lightbulb, title: t('Contextual Suggestions', 'اقتراحات سياقية'), desc: t('AI detects related actions and suggests follow-ups automatically.', 'يكتشف الذكاء الاصطناعي الإجراءات المرتبطة ويقترح متابعات تلقائياً.') },
    { icon: ChartBar, title: t('Productivity Insights', 'رؤى الإنتاجية'), desc: t('Analyze patterns and get personalized recommendations.', 'حلل الأنماط واحصل على توصيات مخصصة.') },
    { icon: ArrowsClockwise, title: t('Cross-Task Linking', 'ربط المهام'), desc: t('Connect related tasks into workflows and sequences.', 'اربط المهام المتعلقة في تسلسلات عمل.') },
    { icon: BellSimple, title: t('Smart Follow-Ups', 'متابعات ذكية'), desc: t('Gentle nudges for overdue tasks with rescheduling suggestions.', 'تنبيهات لطيفة للمهام المتأخرة مع اقتراحات لإعادة الجدولة.') },
    { icon: Sparkle, title: t('Proactive Assistance', 'مساعدة استباقية'), desc: t('AI suggests reminders when it detects implied intent.', 'يقترح الذكاء الاصطناعي تذكيرات عندما يكتشف نية ضمنية.') },
    { icon: Translate, title: t('Multilingual Support', 'دعم متعدد اللغات'), desc: t('Communicate in your preferred language naturally.', 'تواصل بلغتك المفضلة بشكل طبيعي.') },
  ];

  // ── Sample Conversations (4 scenarios) ──
  const conversations = [
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

  // ── Chat Demo State ──
  const welcomeMsg = t("Hi! I'm Letsm AI. Try saying something like \"Remind me to send the report after lunch\" or click the examples below.", 'مرحباً! أنا Letsm AI. جرّب قول "ذكرني بإرسال التقرير بعد الغداء" أو اضغط الأمثلة أدناه.');
  const [demoMessages, setDemoMessages] = useState([
    { id: 1, type: 'ai', content: welcomeMsg },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [demoInput, setDemoInput] = useState('');
  const [demoSessionId, setDemoSessionId] = useState(null);
  const demoChatRef = useRef(null);

  // Reset demo messages when language changes
  useEffect(() => {
    setDemoMessages([{ id: 1, type: 'ai', content: welcomeMsg }]);
    setDemoSessionId(null);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const demoScenarios = [
    { label: t('Set a Reminder', 'تعيين تذكير'), icon: Clock, user: t('Remind me to send the report after lunch', 'ذكرني بإرسال التقرير بعد الغداء'), ai: t('Sure! Would 2pm work for you?', 'بالتأكيد! هل الساعة 2 ظهراً مناسبة؟'), follow: t('Yes', 'نعم'), final: t("Done! I'll remind you at 2pm today.", 'تم! سأذكرك الساعة 2 ظهراً اليوم.'), action: t('Reminder set for 2:00 PM', 'تم تعيين التذكير للساعة 2:00 مساءً') },
    { label: t('Voice Command', 'أمر صوتي'), icon: Microphone, user: t('Voice: Tell me to call Ahmed before my flight', 'صوت: ذكرني بالاتصال بأحمد قبل رحلتي'), ai: t("Got it. When is your flight?", 'حسناً. متى رحلتك؟'), follow: t('Tomorrow at 5pm', 'غداً الساعة 5 مساءً'), final: t("I'll remind you to call Ahmed at 3pm tomorrow.", 'سأذكرك بالاتصال بأحمد الساعة 3 مساءً غداً.'), action: t('Reminder set for tomorrow 3:00 PM', 'تم تعيين التذكير لغداً 3:00 مساءً') },
    { label: t('Recurring Event', 'حدث متكرر'), icon: Calendar, user: t('I keep forgetting my weekly meeting', 'أنسى اجتماعي الأسبوعي'), ai: t('I noticed it happens Mondays at 9am. Want a recurring reminder?', 'لاحظت أنه يوم الاثنين الساعة 9. هل تريد تذكيراً متكرراً؟'), follow: t('Yes please', 'نعم من فضلك'), final: t("Done! Reminder every Monday at 8:45am.", 'تم! تذكير كل اثنين الساعة 8:45 صباحاً.'), action: t('Recurring reminder created', 'تم إنشاء تذكير متكرر') },
  ];

  const runScenario = (i) => {
    if (isTyping) return;
    const s = demoScenarios[i];
    setActiveScenario(i);
    setDemoMessages([{ id: 1, type: 'ai', content: t("Hi! I'm Letsm AI.", 'مرحباً! أنا Letsm AI.') }]);
    setTimeout(() => {
      setDemoMessages(p => [...p, { id: 2, type: 'user', content: s.user }]);
      setIsTyping(true);
      setTimeout(() => { setIsTyping(false); setDemoMessages(p => [...p, { id: 3, type: 'ai', content: s.ai }]);
        setTimeout(() => { setDemoMessages(p => [...p, { id: 4, type: 'user', content: s.follow }]); setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setDemoMessages(p => [...p, { id: 5, type: 'ai', content: s.final }, { id: 6, type: 'action', content: s.action }]); setActiveScenario(null); }, 1000);
        }, 1500);
      }, 1200);
    }, 500);
  };

  const sendDemoMessage = useCallback(async () => {
    const text = demoInput.trim();
    if (!text || isTyping) return;
    setDemoInput('');
    setDemoMessages(p => [...p, { id: Date.now(), type: 'user', content: text }]);
    setIsTyping(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/guest/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: demoSessionId })
      });
      const data = await res.json();
      if (data.session_id) setDemoSessionId(data.session_id);
      setDemoMessages(p => [...p, { id: Date.now() + 1, type: 'ai', content: data.response || data.message }]);
    } catch {
      setDemoMessages(p => [...p, { id: Date.now() + 1, type: 'ai', content: t('Sorry, something went wrong. Sign up for the full experience!', 'عذراً، حدث خطأ. سجّل للحصول على تجربة كاملة!') }]);
    } finally {
      setIsTyping(false);
    }
  }, [demoInput, isTyping, demoSessionId, t]);

  // ── Testimonials ──
  const testimonials = [
    { name: 'Sarah Chen', role: t('Product Manager at TechCorp', 'مديرة منتجات في TechCorp'), initials: 'SC', bg: 'from-green-400 to-emerald-500', quote: t('Letsm AI completely changed how I manage my day. I just text it naturally and everything gets organized. It\'s like having a personal secretary in my pocket.', 'Letsm AI غيّر تماماً طريقة إدارة يومي.') },
    { name: 'Ahmed Al-Rashid', role: t('Freelance Designer', 'مصمم مستقل'), initials: 'AR', bg: 'from-violet-400 to-purple-500', quote: t('The voice note feature is incredible. I record my thoughts while driving and come back to perfectly organized tasks. Game changer!', 'ميزة الملاحظات الصوتية رائعة.') },
    { name: 'Maria Rodriguez', role: t('Marketing Director at GrowthLab', 'مديرة تسويق في GrowthLab'), initials: 'MR', bg: 'from-pink-400 to-rose-500', quote: t('Our entire team uses Letsm AI now. The calendar integration alone saved us hours of back-and-forth scheduling every week.', 'فريقنا بالكامل يستخدم Letsm AI.') },
    { name: 'James Wilson', role: t('Software Engineer at DevStudio', 'مهندس برمجيات في DevStudio'), initials: 'JW', bg: 'from-amber-400 to-orange-500', quote: t('I was skeptical about AI assistants, but Letsm actually understands context. It remembered I always have standup at 9am and auto-suggests prep reminders.', 'كنت متشككاً، لكن Letsm يفهم السياق فعلاً.') },
    { name: 'Priya Sharma', role: t('Entrepreneur at StartupHub', 'رائدة أعمال في StartupHub'), initials: 'PS', bg: 'from-blue-400 to-cyan-500', quote: t('The bill scanning feature saved me from missing a payment deadline. Just snapped a photo and it set up the reminder automatically.', 'ميزة مسح الفواتير أنقذتني.') },
    { name: 'Tom Baker', role: t('Operations Manager at LogiFlow', 'مدير عمليات في LogiFlow'), initials: 'TB', bg: 'from-teal-400 to-green-500', quote: t("Privacy was my biggest concern, but Letsm's zero-knowledge architecture gave me confidence. Great product with great principles.", 'الخصوصية كانت قلقي الأكبر.') },
  ];

  // ── Privacy Features ──
  const privacyFeatures = [
    { icon: ShieldCheck, title: t('End-to-End Encryption', 'تشفير شامل'), desc: t('All your data is encrypted in transit and at rest using industry-standard protocols.', 'جميع بياناتك مشفرة أثناء النقل والتخزين.') },
    { icon: Lock, title: t('Zero-Knowledge Architecture', 'بنية معرفة صفرية'), desc: t("We can't access your personal data. Only you have the keys to your information.", 'لا يمكننا الوصول لبياناتك. أنت فقط من يملك المفتاح.') },
    { icon: Eye, title: t('Transparent Data Usage', 'استخدام بيانات شفاف'), desc: t('Clear visibility into what data we collect and how it\'s used to improve your experience.', 'رؤية واضحة لما نجمعه وكيف نستخدمه.') },
    { icon: UserCheck, title: t('User Control', 'تحكم المستخدم'), desc: t('Full control over your data. Export, delete, or modify your information anytime.', 'تحكم كامل في بياناتك.') },
    { icon: FileText, title: t('GDPR & CCPA Compliant', 'متوافق مع GDPR'), desc: t('We comply with international privacy regulations to protect your rights.', 'نلتزم بلوائح الخصوصية الدولية.') },
    { icon: ShieldCheck, title: t('Minimal Data Collection', 'جمع بيانات أدنى'), desc: t('We only store what\'s necessary to provide the service. No unnecessary tracking.', 'نخزن فقط ما هو ضروري لتقديم الخدمة.') },
  ];

  // ── FAQ ──
  const faqs = [
    { q: t('Can I change plans later?', 'هل يمكنني تغيير الخطة لاحقاً؟'), a: t('Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.', 'نعم! يمكنك ترقية أو تخفيض خطتك في أي وقت.') },
    { q: t('Is there a free trial?', 'هل هناك فترة تجريبية مجانية؟'), a: t('Yes, Pro and Business plans come with a 14-day free trial. No credit card required.', 'نعم، خطط Pro وBusiness تأتي مع تجربة مجانية لمدة 14 يوماً.') },
    { q: t('How does WhatsApp integration work?', 'كيف يعمل تكامل واتساب؟'), a: t("After signing up, you'll receive a QR code to scan with WhatsApp. The AI will then be available in your chats.", 'بعد التسجيل، ستحصل على رمز QR لمسحه بواتساب.') },
    { q: t('What payment methods do you accept?', 'ما طرق الدفع المقبولة؟'), a: t('We accept all major credit cards and debit cards through our secure payment processor Stripe.', 'نقبل جميع بطاقات الائتمان والخصم عبر Stripe.') },
  ];
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (demoChatRef.current) demoChatRef.current.scrollTop = demoChatRef.current.scrollHeight;
  }, [demoMessages, isTyping]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const smoothScroll = useCallback((e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Messaging / Calendar integrations ──
  const messaging = [
    { name: 'WhatsApp', icon: WhatsappLogo, available: true },
    { name: 'Telegram', icon: TelegramLogo, available: true },
    { name: t('Web Chat', 'محادثة الويب'), icon: ChatCircle, available: true },
    { name: 'Slack', icon: ChatTeardrop, available: false },
  ];
  const calendars = [
    { name: 'Google Calendar', available: true },
    { name: 'Outlook', available: true },
    { name: 'Apple Calendar', available: true },
    { name: 'Microsoft 365', available: false },
  ];

  // ── Pricing plans ──
  const plans = [
    { name: t('Free', 'مجاني'), price: '0', period: t(' OMR', ' ر.ع'), desc: t('Perfect for trying Letsm AI', 'مثالي لتجربة Letsm AI'), features: ['10 Messages/day', '5 Active Tasks', 'Basic Reminders', 'Email Support'], cta: t('Start Free', 'ابدأ مجاناً'), pop: false },
    { name: t('Pro', 'برو'), price: '20', period: t(' OMR/mo', ' ر.ع/شهرياً'), desc: t('For individuals who want more', 'للأفراد الذين يريدون المزيد'), features: ['Unlimited Messages', 'Unlimited Tasks', 'Voice Input', 'Advanced Analytics', 'Priority Support', 'Unlimited History'], cta: t('Subscribe Now', 'اشترك الآن'), pop: true },
    { name: t('Business', 'بزنس'), price: '50', period: t(' OMR/mo', ' ر.ع/شهرياً'), desc: t('For teams and power users', 'للفرق والمستخدمين المتقدمين'), features: ['All Pro Features', 'WhatsApp Integration', 'Team up to 10', 'Custom API', 'Account Manager', 'Advanced Analytics'], cta: t('Start Business Trial', 'ابدأ تجربة الأعمال'), pop: false },
  ];

  const heroImage = "https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/c20506ad820af18fca8db646421f81d14372424f9f9dfdbec4992513f7a1d9d2.png";
  const privacyImage = "https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/1a6effa70f08b0d092ef06acba1df41da507e959eb51219376efad3b1f340fe8.png";

  return (
    <div className={`min-h-screen bg-white text-gray-900 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.jpeg" alt="AI by Let's M" className="h-9 w-auto rounded-lg" />
            <span className="font-bold text-lg text-gray-900">Let's M <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={(e) => smoothScroll(e, 'features')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">{t('Features', 'المميزات')}</a>
            <a href="#demo" onClick={(e) => smoothScroll(e, 'demo')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">{t('Demo', 'تجربة')}</a>
            <a href="#pricing" onClick={(e) => smoothScroll(e, 'pricing')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">{t('Pricing', 'الأسعار')}</a>
            <a href="#privacy" onClick={(e) => smoothScroll(e, 'privacy')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">{t('Privacy', 'الخصوصية')}</a>
            <Link to="/login" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">{t('Sign In', 'دخول')}</Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage} className="text-gray-500 hover:text-gray-900 text-sm font-medium" data-testid="lang-toggle"><Globe size={18} /></button>
            <Link to="/login" className="hidden sm:inline-flex bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-violet-700 transition-colors" data-testid="get-started-btn">{t('Get Started', 'ابدأ')}</Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-700 p-1" data-testid="mobile-menu-toggle">
              {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 pb-6 pt-3" data-testid="mobile-menu">
            <div className="flex flex-col gap-1">
              <a href="#features" onClick={(e) => smoothScroll(e, 'features')} className="py-3 text-gray-700 font-medium text-base border-b border-gray-50">{t('Features', 'المميزات')}</a>
              <a href="#demo" onClick={(e) => smoothScroll(e, 'demo')} className="py-3 text-gray-700 font-medium text-base border-b border-gray-50">{t('Demo', 'تجربة')}</a>
              <a href="#pricing" onClick={(e) => smoothScroll(e, 'pricing')} className="py-3 text-gray-700 font-medium text-base border-b border-gray-50">{t('Pricing', 'الأسعار')}</a>
              <a href="#privacy" onClick={(e) => smoothScroll(e, 'privacy')} className="py-3 text-gray-700 font-medium text-base border-b border-gray-50">{t('Privacy', 'الخصوصية')}</a>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-3 text-gray-700 font-medium text-base border-b border-gray-50">{t('Sign In', 'دخول')}</Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="mt-3 bg-violet-600 text-white text-center font-medium py-3 rounded-full hover:bg-violet-700 transition-colors" data-testid="mobile-get-started-btn">{t('Get Started Free', 'ابدأ مجاناً')}</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 via-white to-white"></div>
        <div className="relative max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-full mb-8">
                <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                <span className="text-sm font-medium text-violet-700">{t('AI-Powered Personal Assistant', 'مساعد شخصي ذكي')}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                {t('Your Life,', 'حياتك،')} <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500">{t('Simplified', 'مُبسَّطة')}</span>
              </h1>
              <p className="text-lg text-gray-500 mb-10 max-w-lg leading-relaxed">{t('Manage tasks, reminders, schedules, and workflows through natural conversation. Letsm AI understands you, remembers your preferences, and helps you stay organized.', 'أدِر المهام والتذكيرات والجداول من خلال المحادثة الطبيعية. Letsm AI يفهمك ويتذكر تفضيلاتك.')}</p>
              <div className="flex flex-wrap gap-4 mb-10">
                <Link to="/login" className="bg-violet-600 text-white font-medium px-8 py-3.5 rounded-full hover:bg-violet-700 transition-colors inline-flex items-center gap-2" data-testid="hero-cta">
                  {t('Get Started Free', 'ابدأ مجاناً')} <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                </Link>
                <a href="#demo" onClick={(e) => smoothScroll(e, 'demo')} className="bg-white text-gray-700 font-medium px-8 py-3.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors inline-flex items-center gap-2" data-testid="watch-demo-button">
                  <Play size={18} className="text-violet-600" weight="fill" /> {t('Try Demo', 'جرّب التجربة')}
                </a>
              </div>
              <div className="flex flex-wrap gap-3">
                {heroPills.map((p) => (
                  <span key={p.label} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${p.cls}`}>
                    <p.icon size={16} weight="fill" /> {p.label}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative hidden lg:block">
              <img src={heroImage} alt="Letsm AI Interface" className="w-full rounded-3xl" />
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className={`absolute ${isRTL ? '-right-4' : '-left-4'} top-16 bg-white border border-gray-200 rounded-2xl p-4 max-w-[200px]`}>
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center"><CheckCircle size={16} className="text-violet-600" weight="fill" /></div><div><p className="text-sm font-medium text-gray-900">{t('Task Created', 'تم إنشاء المهمة')}</p><p className="text-xs text-gray-400">{t('Send report at 2pm', 'إرسال التقرير 2 مساءً')}</p></div></div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className={`absolute ${isRTL ? '-left-4' : '-right-4'} bottom-24 bg-white border border-gray-200 rounded-2xl p-4`}>
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center"><Check size={16} className="text-emerald-600" weight="bold" /></div><div><p className="text-sm font-semibold text-gray-900">98% {t('accuracy', 'دقة')}</p></div></div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 md:py-32 bg-[#f8f9ff]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-medium text-sm">{t('Features', 'المميزات')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('Powerful Features', 'مميزات قوية')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('Everything you need to manage your life, powered by AI', 'كل ما تحتاجه لإدارة حياتك، مدعوم بالذكاء الاصطناعي')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div key={f.title || f.name || f.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10" data-testid={`feature-card-${i}`}>
                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mb-5`}><f.icon size={28} weight="duotone" /></div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADVANCED FEATURES ── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-medium text-sm">{t('Advanced', 'متقدم')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('Enhanced Intelligence', 'ذكاء معزز')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('Advanced capabilities that make Letsm AI truly smart', 'قدرات متقدمة تجعل Letsm AI ذكياً حقاً')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {advancedFeatures.map((f, i) => (
              <motion.div key={f.title || f.name || f.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10">
                <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-5"><f.icon size={28} weight="duotone" /></div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ── */}
      <section id="demo" className="py-24 md:py-32 bg-[#f8f9ff]">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-medium text-sm">{t('Live Demo', 'تجربة حية')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('See It In Action', 'شاهده يعمل')}</h2>
            <p className="text-lg text-gray-500">{t('Experience how natural conversation becomes powerful productivity', 'اختبر كيف تتحول المحادثة الطبيعية إلى إنتاجية')}</p>
          </div>
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl overflow-hidden flex flex-col h-[520px]" data-testid="chat-demo">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-500 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Sparkle size={18} className="text-white" weight="fill" /></div>
                <div><h3 className="text-white font-semibold text-sm">Letsm AI</h3><p className="text-white/70 text-xs">{t('Always here to help', 'دائماً هنا للمساعدة')}</p></div>
              </div>
              <div ref={demoChatRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
                {demoMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'action' ? (
                      <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" weight="fill" />
                        <span className="text-sm font-medium text-emerald-800">{msg.content}</span>
                      </div>
                    ) : (
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.type === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`} dir="auto">{msg.type === 'ai' ? renderMd(msg.content) : msg.content}</div>
                    )}
                  </div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3"><div className="flex gap-1.5"><div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'0.15s'}}></div><div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'0.3s'}}></div></div></div></div>}
              </div>
              <div className="p-4 border-t border-gray-100"><div className="flex items-center gap-2"><input type="text" value={demoInput} onChange={(e) => setDemoInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendDemoMessage()} placeholder={t('Type a message...', 'اكتب رسالة...')} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400" data-testid="demo-chat-input" /><button onClick={sendDemoMessage} disabled={isTyping || !demoInput.trim()} className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center text-white hover:bg-violet-700 transition-colors disabled:opacity-50" data-testid="demo-chat-send"><PaperPlaneTilt size={16} weight="fill" /></button></div></div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg mb-2">{t('Try These Examples:', 'جرّب هذه الأمثلة:')}</h3>
              {demoScenarios.map((s, i) => (
                <button key={s.title || s.label} onClick={() => runScenario(i)} className={`w-full text-left p-5 rounded-2xl border transition-all ${activeScenario === i ? 'border-violet-400 bg-violet-50/50' : 'border-gray-200 hover:border-gray-300 bg-white'}`} data-testid={`demo-scenario-${i}`}>
                  <div className="flex items-center gap-2.5 mb-1"><s.icon size={18} className="text-violet-600" /><span className="font-medium text-gray-900 text-sm">{s.label}</span></div>
                  <p className="text-sm text-gray-400">"{s.user}"</p>
                </button>
              ))}
              <div className="p-5 bg-violet-50 border border-violet-200 rounded-2xl mt-4">
                <div className="flex items-center gap-2 mb-1"><Sparkle size={14} className="text-violet-600" weight="fill" /><h4 className="font-semibold text-violet-900 text-sm">{t('Pro Tip', 'نصيحة')}</h4></div>
                <p className="text-sm text-violet-700 leading-relaxed">{t('Letsm AI understands context, remembers your preferences, and learns from your habits.', 'Letsm AI يفهم السياق ويتذكر تفضيلاتك ويتعلم من عاداتك.')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL CONVERSATIONS ── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-medium text-sm">{t('Examples', 'أمثلة')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('Real Conversations', 'محادثات حقيقية')}</h2>
            <p className="text-lg text-gray-500">{t('See how natural interactions become powerful actions', 'شاهد كيف تتحول التفاعلات الطبيعية إلى إجراءات قوية')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8" data-testid="conversations-grid">
            {conversations.map((conv, ci) => (
              <motion.div key={conv.action} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: ci * 0.1 }} viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-3xl p-8">
                <p className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-wider">{t(`Scenario ${ci + 1}`, `سيناريو ${ci + 1}`)}</p>
                <div className="space-y-3">
                  {conv.messages.map((m, mi) => (
                    <div key={`${conv.action}-${mi}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`} dir="auto">{m.text}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" weight="fill" />
                  <span className="text-sm font-medium text-emerald-800">{conv.action}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section className="py-24 md:py-32 bg-[#f8f9ff]">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-medium text-sm">{t('Integrations', 'تكاملات')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('Works ', 'يعمل ')}<span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500">{t('Everywhere', 'في كل مكان')}</span>{t(' You Do', '')}</h2>
            <p className="text-lg text-gray-500">{t('Seamlessly integrate with your favorite platforms', 'تكامل سلس مع منصاتك المفضلة')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8" data-testid="integrations-section">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center"><ChatTeardrop size={24} className="text-violet-600" weight="duotone" /></div><div><h3 className="text-xl font-bold text-gray-900">{t('Messaging', 'المراسلة')}</h3><p className="text-sm text-gray-400">{t('Chat on your preferred app', 'تحدث عبر تطبيقك المفضل')}</p></div></div>
              <div className="grid grid-cols-2 gap-3">
                {messaging.map((p) => (<div key={p.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-2.5"><p.icon size={20} className="text-gray-600" weight="fill" /><span className="text-sm font-medium text-gray-900">{p.name}</span></div>{!p.available && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{t('Soon', 'قريباً')}</span>}</div>))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center"><Calendar size={24} className="text-violet-600" weight="duotone" /></div><div><h3 className="text-xl font-bold text-gray-900">{t('Calendar', 'التقويم')}</h3><p className="text-sm text-gray-400">{t('Sync across all calendars', 'مزامنة عبر جميع التقويمات')}</p></div></div>
              <div className="grid grid-cols-2 gap-3">
                {calendars.map((p) => (<div key={p.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><span className="text-sm font-medium text-gray-900">{p.name}</span>{!p.available && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{t('Soon', 'قريباً')}</span>}</div>))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Sample Interactions Gallery ═══ */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white" data-testid="interactions-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-cyan-600 font-medium text-sm">{t('See It In Action', 'شاهده بالعمل')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('What You Can ', 'ماذا يمكنك ')}<span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">{t('Ask', 'أن تسأل')}</span></h2>
            <p className="text-lg text-gray-500">{t('Real conversations with your AI assistant', 'محادثات حقيقية مع مساعدك الذكي')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { gradient: 'from-cyan-500 to-blue-500', emoji: '🌅', title: t('Morning Briefing', 'ملخص الصباح'), user: t('"What\'s my plan for today?"', '"ايش خطتي اليوم؟"'), bot: t('"Good morning! You have 3 tasks due today: Team standup at 9am, Client proposal by 2pm, and Gym at 6pm. Your first reminder is in 45 minutes."', '"صباح الخير! عندك 3 مهام اليوم: اجتماع الفريق الساعة 9، عرض العميل قبل 2، والجم الساعة 6. أول تذكير بعد 45 دقيقة."') },
              { gradient: 'from-violet-500 to-purple-500', emoji: '📋', title: t('Task Delegation', 'توزيع المهام'), user: t('"Create a task to review the budget report, high priority, due tomorrow"', '"أنشئ مهمة مراجعة تقرير الميزانية، أولوية عالية، بكرة"'), bot: t('"Done! Task created: Review budget report. Priority: High. Due: Tomorrow 9:00 AM. Want me to set a reminder too?"', '"تم! مهمة جديدة: مراجعة تقرير الميزانية. أولوية: عالية. الموعد: بكرة 9 صباحاً. تبي أسوي تذكير بعد؟"') },
              { gradient: 'from-emerald-500 to-teal-500', emoji: '🤝', title: t('Meeting Prep', 'تحضير الاجتماع'), user: t('"Remind me 15 minutes before the client meeting"', '"ذكرني قبل اجتماع العميل بربع ساعة"'), bot: t('"Reminder set! I\'ll notify you at 1:45 PM, 15 minutes before your client meeting. I\'ll also prepare a summary of pending tasks."', '"تم! سأذكرك الساعة 1:45، قبل الاجتماع بربع ساعة. وسأجهز لك ملخص بالمهام المعلقة."') },
              { gradient: 'from-orange-500 to-amber-500', emoji: '🛒', title: t('Shopping List', 'قائمة التسوق'), user: t('"Add to my shopping list: milk, eggs, bread, and coffee"', '"أضف لقائمة التسوق: حليب، بيض، خبز، وقهوة"'), bot: t('"Added 4 items to your shopping list! You now have 7 items total. Want me to remind you when you\'re near the store?"', '"أضفت 4 عناصر! عندك 7 الآن في القائمة. تبي أذكرك لما تكون قريب من السوق؟"') },
              { gradient: 'from-pink-500 to-rose-500', emoji: '✈️', title: t('Travel Planning', 'تخطيط السفر'), user: t('"I have a trip next week, help me prepare"', '"عندي رحلة الأسبوع الجاي، ساعدني أجهز"'), bot: t('"Let me help! I\'ve created a travel checklist with 8 items. I\'ll set reminders for: passport check (3 days before), packing (day before), and airport departure."', '"خلني أساعدك! سويت قائمة تجهيزات 8 عناصر. وسأسوي تذكيرات: فحص الجواز (قبل 3 أيام)، الشنط (قبل يوم)، والمطار."') },
              { gradient: 'from-blue-500 to-indigo-500', emoji: '🏋️', title: t('Fitness Tracking', 'تتبع اللياقة'), user: t('"Track my workout: 30 min run, 20 pushups"', '"سجّل تمريني: جري 30 دقيقة، 20 ضغط"'), bot: t('"Workout logged! Great session. This week: 3 workouts completed, 2 hours total. You\'re on a 5-day streak! Keep it up."', '"تم التسجيل! تمرين ممتاز. هذا الأسبوع: 3 تمارين، ساعتين. عندك سلسلة 5 أيام! استمر."') },
            ].map((card, i) => (
              <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} viewport={{ once: true }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300" data-testid={`interaction-card-${i}`}>
                <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{card.emoji}</span>
                    <h3 className="font-bold text-gray-900">{card.title}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs">👤</span></div>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl rounded-tl-none px-3 py-2" dir="auto">{card.user}</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs text-white">AI</span></div>
                      <p className="text-sm text-gray-600 bg-blue-50 rounded-xl rounded-tl-none px-3 py-2" dir="auto">{card.bot}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ── TESTIMONIALS ── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-medium text-sm">{t('Testimonials', 'آراء المستخدمين')}</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">{t('Loved by Thousands', 'محبوب من الآلاف')}</h2>
            <p className="text-lg text-gray-500">{t('See what our users have to say about Letsm AI', 'شاهد ما يقوله مستخدمونا')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="testimonials-grid">
            {testimonials.map((tt, i) => (
              <motion.div key={tt.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-3xl p-8">
                <p className="text-gray-500 mb-6 leading-relaxed">"{tt.quote}"</p>
                <div className="flex items-center gap-3"><div className={`w-10 h-10 bg-gradient-to-br ${tt.bg} rounded-full flex items-center justify-center text-white text-sm font-bold`}>{tt.initials}</div><div><p className="font-semibold text-gray-900 text-sm">{tt.name}</p><p className="text-xs text-gray-400">{tt.role}</p></div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY ── */}
      <section id="privacy" className="py-24 md:py-32 bg-[#f8f9ff]">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('Your Privacy, Our Priority', 'خصوصيتك، أولويتنا')}</h2>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto">{t("We believe powerful AI assistance shouldn't come at the cost of your privacy. Letsm AI is built with privacy-first principles.", 'نؤمن أن المساعدة الذكية لا يجب أن تأتي على حساب خصوصيتك.')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16" data-testid="privacy-features">
            {privacyFeatures.map((f, i) => (
              <div key={f.title || f.icon} className="bg-white border border-gray-200 rounded-3xl p-8">
                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-4"><f.icon size={24} className="text-violet-600" weight="duotone" /></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-10 items-center bg-white border border-gray-200 rounded-3xl p-8 md:p-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">{t('Our Commitment to You', 'التزامنا تجاهك')}</h3>
              <ul className="space-y-4">
                {[t('Never sell your personal data to third parties', 'لن نبيع بياناتك لأطراف ثالثة'), t('No tracking across other websites or apps', 'لا تتبع عبر مواقع أخرى'), t('Regular security audits by independent experts', 'تدقيقات أمنية منتظمة'), t('Transparent incident reporting and communication', 'تقارير حوادث شفافة')].map((item) => (
                  <li key={item} className="flex items-start gap-3"><CheckCircle size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" weight="fill" /><span className="text-gray-600">{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center"><img src={privacyImage} alt="Privacy" className="w-64 h-64 object-contain" /></div>
          </div>
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-3xl p-8">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">{t('Safety Guidelines', 'إرشادات السلامة')}</h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li>{t('Never share passwords, credit card numbers, or sensitive credentials', 'لا تشارك كلمات المرور أو أرقام البطاقات')}</li>
              <li>{t('We decline requests involving illegal activities or harmful content', 'نرفض طلبات الأنشطة غير القانونية')}</li>
              <li>{t('For financial transactions, always verify through official channels', 'للمعاملات المالية، تحقق عبر القنوات الرسمية')}</li>
              <li>{t('Report any suspicious behavior or security concerns immediately', 'أبلغ عن أي سلوك مشبوه فوراً')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('Simple, Transparent Pricing', 'أسعار شفافة وبسيطة')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('Choose the plan that fits. Upgrade or downgrade anytime.', 'اختر الخطة المناسبة. ترقية أو تخفيض في أي وقت.')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }}
                className={`relative rounded-3xl p-8 md:p-10 ${plan.pop ? 'bg-violet-600 text-white ring-4 ring-violet-200' : 'bg-white border border-gray-200'}`} data-testid={`pricing-plan-${i}`}>
                {plan.pop && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-violet-600 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">{t('Most Popular', 'الأكثر شعبية')}</div>}
                <h3 className={`text-xl font-semibold mb-1 ${plan.pop ? '' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`text-sm mb-5 ${plan.pop ? 'text-white/60' : 'text-gray-400'}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6"><span className="text-5xl font-bold">{plan.price}</span>{plan.period && <span className={plan.pop ? 'text-white/60' : 'text-gray-400'}>{plan.period}</span>}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (<li key={f} className="flex items-center gap-2.5"><CheckCircle size={18} weight="fill" className={plan.pop ? 'text-white' : 'text-emerald-500'} /><span className={`text-sm ${plan.pop ? 'text-white/90' : 'text-gray-600'}`}>{f}</span></li>))}
                </ul>
                <Link to="/login" className={`block w-full py-3.5 text-center font-medium rounded-full transition-colors ${plan.pop ? 'bg-white text-violet-600 hover:bg-gray-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{plan.cta}</Link>
              </motion.div>
            ))}
          </div>
          {/* FAQ */}
          <div className="max-w-3xl mx-auto mt-20" data-testid="faq-section">
            <h3 className="text-3xl font-bold text-center mb-8">{t('Frequently Asked Questions', 'أسئلة شائعة')}</h3>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={faq.q} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left" data-testid={`faq-${i}`}>
                    <h4 className="font-medium text-gray-900">{faq.q}</h4>
                    <CaretRight size={16} className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                  </button>
                  {openFaq === i && <div className="px-5 pb-5 text-gray-500 text-sm leading-relaxed">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-violet-50/50 to-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="text-sm text-violet-600 font-medium mb-4">{t('Start for free, no credit card required', 'ابدأ مجاناً، بدون بطاقة ائتمان')}</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{t('Ready to Simplify', 'هل أنت مستعد لتبسيط')}<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500">{t('Your Life?', 'حياتك؟')}</span></h2>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">{t('Join thousands of professionals who use Letsm AI to stay organized, productive, and in control of their day.', 'انضم لآلاف المحترفين الذين يستخدمون Letsm AI.')}</p>
          <div className="flex justify-center gap-4 mb-16">
            <Link to="/login" className="bg-violet-600 text-white font-medium px-10 py-4 rounded-full hover:bg-violet-700 transition-colors inline-flex items-center gap-2">{t('Get Started Free', 'ابدأ مجاناً')} <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} /></Link>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[{ v: '50K+', l: t('Active Users', 'مستخدم نشط') }, { v: '2M+', l: t('Tasks Created', 'مهمة مُنشأة') }, { v: '99.9%', l: t('Uptime', 'وقت التشغيل') }].map((s, i) => (
              <div key={s.v || s.l} className="text-center"><p className="text-4xl md:text-5xl font-bold text-gray-900">{s.v}</p><p className="text-gray-400 mt-1">{s.l}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5"><img src="/logo.jpeg" alt="AI by Let's M" className="h-8 w-auto rounded-lg" /><span className="font-bold text-gray-900">Let's M <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI</span></span></div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#privacy" className="hover:text-gray-600">{t('Privacy', 'الخصوصية')}</a>
            <a href="#" className="hover:text-gray-600">{t('Terms', 'الشروط')}</a>
            <a href="#" className="hover:text-gray-600">{t('Support', 'الدعم')}</a>
            <a href="#" className="hover:text-gray-600">{t('Contact', 'تواصل')}</a>
          </div>
          <p className="text-sm text-gray-400">2026 Letsm AI</p>
        </div>
      </footer>

      {/* ── BACK TO TOP ── */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className={`fixed ${isRTL ? 'left-6' : 'right-6'} bottom-24 z-40 w-11 h-11 bg-violet-600 text-white rounded-full flex items-center justify-center hover:bg-violet-700 transition-colors border-2 border-white`}
          data-testid="back-to-top-button"
          aria-label="Back to top"
        >
          <ArrowUp size={20} weight="bold" />
        </motion.button>
      )}

      <FloatingChat language={language} isRTL={isRTL} />
    </div>
  );
};

export default Landing;
