import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { 
  ArrowRight,
  Play,
  ChatTeardrop,
  Calendar,
  ShieldCheck,
  Brain,
  Check,
  Star,
  Lightning,
  Globe,
  CheckCircle,
  Clock,
  Sparkle,
  Microphone,
  WhatsappLogo,
  TelegramLogo,
  ChatCircle,
  Lock,
  Eye,
  UserCheck,
  FileText,
  Phone,
  Image,
  PaperPlaneTilt,
  Robot,
  User,
  CaretRight
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const Landing = () => {
  const { language, toggleLanguage, isRTL } = useLanguage();

  const features = [
    { icon: ChatTeardrop, title: language === 'ar' ? 'لغة طبيعية' : 'Natural Language', color: 'text-green-500', bg: 'bg-green-50' },
    { icon: Calendar, title: language === 'ar' ? 'جدولة ذكية' : 'Smart Scheduling', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Brain, title: language === 'ar' ? 'وعي سياقي' : 'Context-Aware', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: ShieldCheck, title: language === 'ar' ? 'الخصوصية أولاً' : 'Privacy-First', color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  const detailedFeatures = [
    {
      icon: ChatTeardrop,
      title: language === 'ar' ? 'فهم اللغة الطبيعية' : 'Natural Language Understanding',
      description: language === 'ar' ? 'تحدث بشكل طبيعي. يفهم Letsm AI اللغة العامية والتعبيرات الزمنية والإدخال متعدد اللغات.' : 'Talk naturally. Letsm AI understands casual language, vague time expressions, and multilingual input.',
      iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', borderColor: 'hover:border-indigo-300',
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'إدارة ذكية للمهام' : 'Smart Task Management',
      description: language === 'ar' ? 'أنشئ وعدّل وأدِر المهام والتذكيرات بأوامر بسيطة.' : 'Create, edit, and manage tasks, reminders, and recurring events with simple commands.',
      iconBg: 'bg-purple-100', iconColor: 'text-purple-600', borderColor: 'hover:border-purple-300',
    },
    {
      icon: Calendar,
      title: language === 'ar' ? 'تكامل التقويم' : 'Calendar Integration',
      description: language === 'ar' ? 'زامن مع تقويم Google وOutlook. تحقق من التوفر وجدول الاجتماعات بسهولة.' : 'Sync with Google and Outlook Calendar. Check availability and schedule meetings effortlessly.',
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'hover:border-blue-300',
    },
    {
      icon: Microphone,
      title: language === 'ar' ? 'ذكاء صوتي' : 'Voice Intelligence',
      description: language === 'ar' ? 'أرسل ملاحظات صوتية ودع الذكاء الاصطناعي يحولها وينشئ مهام تلقائياً.' : 'Send voice notes and let AI transcribe and create tasks automatically from your spoken words.',
      iconBg: 'bg-pink-100', iconColor: 'text-pink-600', borderColor: 'hover:border-pink-300',
    },
    {
      icon: Lightning,
      title: language === 'ar' ? 'كشف الأولويات' : 'Priority Detection',
      description: language === 'ar' ? 'يحدد الذكاء الاصطناعي المهام العاجلة تلقائياً بناءً على المواعيد والسياق.' : 'AI automatically identifies urgent tasks based on deadlines, language, and context.',
      iconBg: 'bg-amber-100', iconColor: 'text-amber-600', borderColor: 'hover:border-amber-300',
    },
    {
      icon: Sparkle,
      title: language === 'ar' ? 'مدعوم بـ GPT-5.2' : 'Powered by GPT-5.2',
      description: language === 'ar' ? 'أحدث تقنيات الذكاء الاصطناعي لفهم أعمق ومساعدة أذكى.' : 'Latest AI technology for deeper understanding and smarter assistance.',
      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'hover:border-emerald-300',
    },
  ];

  const plans = [
    {
      name: language === 'ar' ? 'مجاني' : 'Free',
      price: '$0',
      description: language === 'ar' ? 'مثالي لتجربة Letsm AI' : 'Perfect for trying out Letsm AI',
      features: language === 'ar' ? ['5 مهام نشطة', '3 محادثات يومياً', 'تذكيرات أساسية', 'دعم البريد'] : ['5 Active Tasks', '3 Conversations/day', 'Basic Reminders', 'Email Support'],
      cta: language === 'ar' ? 'ابدأ مجاناً' : 'Start Free',
      highlighted: false,
    },
    {
      name: language === 'ar' ? 'احترافي' : 'Pro',
      price: '$9.99',
      period: language === 'ar' ? '/شهرياً' : '/mo',
      description: language === 'ar' ? 'للأفراد الذين يريدون المزيد من القوة' : 'For individuals who want more power',
      features: language === 'ar' ? ['مهام غير محدودة', 'محادثات غير محدودة', 'إدخال صوتي', 'إحصائيات متقدمة', 'أولوية الدعم', 'سجل غير محدود'] : ['Unlimited Tasks', 'Unlimited Conversations', 'Voice Input', 'Advanced Analytics', 'Priority Support', 'Unlimited History'],
      cta: language === 'ar' ? 'اشترك الآن' : 'Subscribe Now',
      highlighted: true,
    },
    {
      name: language === 'ar' ? 'أعمال' : 'Business',
      price: '$29.99',
      period: language === 'ar' ? '/شهرياً' : '/mo',
      description: language === 'ar' ? 'للفرق والمستخدمين المتقدمين' : 'For teams and power users',
      features: language === 'ar' ? ['كل ميزات Pro', 'تكامل واتساب', 'فريق حتى 10 أعضاء', 'API مخصص', 'مدير حساب', 'تحليلات متقدمة'] : ['All Pro Features', 'WhatsApp Integration', 'Team up to 10', 'Custom API', 'Account Manager', 'Advanced Analytics'],
      cta: language === 'ar' ? 'تواصل معنا' : 'Start Business Trial',
      highlighted: false,
    },
  ];

  // Chat Demo state
  const [demoMessages, setDemoMessages] = useState([
    { id: 1, type: 'ai', content: language === 'ar' ? 'مرحباً! أنا Letsm AI. جرّب قول شيء مثل "ذكرني بإرسال التقرير بعد الغداء" أو اضغط على الأمثلة أدناه.' : 'Hi! I\'m Letsm AI. Try saying something like "Remind me to send the report after lunch" or click the examples below.' },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);

  const demoScenarios = [
    {
      label: language === 'ar' ? 'تعيين تذكير' : 'Set a Reminder',
      icon: Clock,
      userMessage: language === 'ar' ? 'ذكرني بإرسال التقرير بعد الغداء' : 'Remind me to send the report after lunch',
      aiResponse: language === 'ar' ? 'بالتأكيد! هل الساعة 2 ظهراً مناسبة لك؟' : 'Sure! Would 2pm work for you?',
      followUp: language === 'ar' ? 'نعم' : 'Yes',
      finalResponse: language === 'ar' ? 'تم! سأذكرك الساعة 2 ظهراً اليوم.' : 'Done! I\'ll remind you at 2pm today.',
      action: language === 'ar' ? 'تم تعيين التذكير للساعة 2:00 مساءً' : 'Reminder set for 2:00 PM',
    },
    {
      label: language === 'ar' ? 'أمر صوتي' : 'Voice Command',
      icon: Microphone,
      userMessage: language === 'ar' ? 'صوت: ذكرني بالاتصال بأحمد قبل رحلتي' : 'Voice: Tell me to call Ahmed before my flight',
      aiResponse: language === 'ar' ? 'حسناً. متى رحلتك؟' : 'Got it. When is your flight?',
      followUp: language === 'ar' ? 'غداً الساعة 5 مساءً' : 'Tomorrow at 5pm',
      finalResponse: language === 'ar' ? 'ممتاز! سأذكرك بالاتصال بأحمد الساعة 3 مساءً غداً.' : 'Perfect! I\'ll remind you to call Ahmed at 3pm tomorrow.',
      action: language === 'ar' ? 'تم تعيين التذكير لغداً 3:00 مساءً' : 'Reminder set for tomorrow 3:00 PM',
    },
    {
      label: language === 'ar' ? 'حدث متكرر' : 'Recurring Event',
      icon: Calendar,
      userMessage: language === 'ar' ? 'أنسى اجتماعي الأسبوعي دائماً' : 'I keep forgetting my weekly meeting',
      aiResponse: language === 'ar' ? 'لاحظت أنه يوم الاثنين الساعة 9 صباحاً. هل تريد تذكيراً متكرراً؟' : 'I noticed it happens Mondays at 9am. Want me to set a recurring reminder?',
      followUp: language === 'ar' ? 'نعم من فضلك' : 'Yes please',
      finalResponse: language === 'ar' ? 'تم! ستحصل على تذكير كل اثنين الساعة 8:45 صباحاً.' : 'Done! You\'ll get a reminder every Monday at 8:45am.',
      action: language === 'ar' ? 'تم إنشاء تذكير متكرر' : 'Recurring reminder created',
    },
  ];

  const runScenario = (index) => {
    if (isTyping) return;
    const scenario = demoScenarios[index];
    setActiveScenario(index);
    setDemoMessages([
      { id: 1, type: 'ai', content: language === 'ar' ? 'مرحباً! أنا Letsm AI.' : 'Hi! I\'m Letsm AI.' },
    ]);

    setTimeout(() => {
      setDemoMessages(prev => [...prev, { id: 2, type: 'user', content: scenario.userMessage }]);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setDemoMessages(prev => [...prev, { id: 3, type: 'ai', content: scenario.aiResponse }]);
        setTimeout(() => {
          setDemoMessages(prev => [...prev, { id: 4, type: 'user', content: scenario.followUp }]);
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setDemoMessages(prev => [
              ...prev,
              { id: 5, type: 'ai', content: scenario.finalResponse },
              { id: 6, type: 'action', content: scenario.action },
            ]);
            setActiveScenario(null);
          }, 1000);
        }, 1500);
      }, 1200);
    }, 500);
  };

  const testimonials = [
    { name: 'Sarah Chen', role: language === 'ar' ? 'مديرة منتجات' : 'Product Manager', company: 'TechCorp', initials: 'SC', bg: 'from-indigo-500 to-purple-500', quote: language === 'ar' ? 'Letsm AI غيّر تماماً طريقة إدارة يومي. أكتب له بشكل طبيعي وكل شيء يتم تنظيمه.' : 'Letsm AI completely changed how I manage my day. I just text it naturally and everything gets organized.' },
    { name: 'Ahmed Al-Rashid', role: language === 'ar' ? 'مصمم مستقل' : 'Freelance Designer', company: language === 'ar' ? 'عمل حر' : 'Self-employed', initials: 'AR', bg: 'from-emerald-500 to-teal-500', quote: language === 'ar' ? 'ميزة الإدخال الصوتي رائعة. أسجل أفكاري أثناء القيادة وأجد كل المهام مرتبة.' : 'The voice note feature is incredible. I record my thoughts while driving and come back to perfectly organized tasks.' },
    { name: 'Maria Rodriguez', role: language === 'ar' ? 'مديرة تسويق' : 'Marketing Director', company: 'GrowthLab', initials: 'MR', bg: 'from-pink-500 to-rose-500', quote: language === 'ar' ? 'فريقنا بالكامل يستخدم Letsm AI الآن. تكامل التقويم وحده وفّر لنا ساعات أسبوعياً.' : 'Our entire team uses Letsm AI now. The calendar integration alone saved us hours of scheduling every week.' },
    { name: 'James Wilson', role: language === 'ar' ? 'مهندس برمجيات' : 'Software Engineer', company: 'DevStudio', initials: 'JW', bg: 'from-amber-500 to-orange-500', quote: language === 'ar' ? 'كنت متشككاً، لكن Letsm يفهم السياق فعلاً. تذكر أن لدي standup الساعة 9 ويقترح تذكيرات تحضيرية.' : 'I was skeptical about AI assistants, but Letsm actually understands context. It remembered I always have standup at 9am.' },
    { name: 'Priya Sharma', role: language === 'ar' ? 'رائدة أعمال' : 'Entrepreneur', company: 'StartupHub', initials: 'PS', bg: 'from-blue-500 to-cyan-500', quote: language === 'ar' ? 'ميزة مسح الفواتير أنقذتني من تفويت موعد دفع. التقطت صورة وتم إعداد التذكير تلقائياً.' : 'The bill scanning feature saved me from missing a payment deadline. Just snapped a photo and it set up the reminder.' },
    { name: 'Tom Baker', role: language === 'ar' ? 'مدير عمليات' : 'Operations Manager', company: 'LogiFlow', initials: 'TB', bg: 'from-violet-500 to-purple-500', quote: language === 'ar' ? 'الخصوصية كانت قلقي الأكبر، لكن بنية Letsm المعرفة الصفرية أعطتني الثقة. منتج رائع.' : 'Privacy was my biggest concern, but Letsm\'s zero-knowledge architecture gave me confidence. Great product.' },
  ];

  const messagingPlatforms = [
    { name: 'WhatsApp', icon: WhatsappLogo, available: true },
    { name: 'Telegram', icon: TelegramLogo, available: true },
    { name: language === 'ar' ? 'محادثة الويب' : 'Web Chat', icon: ChatCircle, available: true },
    { name: 'Slack', icon: ChatTeardrop, available: false },
  ];

  const calendarPlatforms = [
    { name: 'Google Calendar', available: true },
    { name: 'Outlook', available: true },
    { name: 'Apple Calendar', available: true },
    { name: 'Microsoft 365', available: false },
  ];

  const privacyFeatures = [
    { icon: ShieldCheck, title: language === 'ar' ? 'تشفير شامل' : 'End-to-End Encryption', desc: language === 'ar' ? 'جميع بياناتك مشفرة أثناء النقل والتخزين.' : 'All your data is encrypted in transit and at rest.' },
    { icon: Lock, title: language === 'ar' ? 'بنية معرفة صفرية' : 'Zero-Knowledge Architecture', desc: language === 'ar' ? 'لا يمكننا الوصول لبياناتك الشخصية. أنت فقط من يملك المفتاح.' : 'We can\'t access your personal data. Only you have the keys.' },
    { icon: Eye, title: language === 'ar' ? 'استخدام بيانات شفاف' : 'Transparent Data Usage', desc: language === 'ar' ? 'رؤية واضحة لما نجمعه وكيف نستخدمه.' : 'Clear visibility into what data we collect and how it\'s used.' },
    { icon: UserCheck, title: language === 'ar' ? 'تحكم المستخدم' : 'User Control', desc: language === 'ar' ? 'تحكم كامل في بياناتك. صدّر، احذف، أو عدّل في أي وقت.' : 'Full control over your data. Export, delete, or modify anytime.' },
    { icon: FileText, title: language === 'ar' ? 'متوافق مع GDPR' : 'GDPR & CCPA Compliant', desc: language === 'ar' ? 'نلتزم بلوائح الخصوصية الدولية.' : 'We comply with international privacy regulations.' },
    { icon: ShieldCheck, title: language === 'ar' ? 'جمع بيانات أدنى' : 'Minimal Data Collection', desc: language === 'ar' ? 'نخزن فقط ما هو ضروري لتقديم الخدمة.' : 'We only store what\'s necessary to provide the service.' },
  ];

  const faqs = [
    { q: language === 'ar' ? 'هل يمكنني تغيير الخطة لاحقاً؟' : 'Can I change plans later?', a: language === 'ar' ? 'نعم! يمكنك ترقية أو تخفيض خطتك في أي وقت.' : 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
    { q: language === 'ar' ? 'هل هناك فترة تجريبية مجانية؟' : 'Is there a free trial?', a: language === 'ar' ? 'نعم، خطط Pro وBusiness تأتي مع تجربة مجانية لمدة 14 يوماً.' : 'Yes, Pro and Business plans come with a 14-day free trial. No credit card required.' },
    { q: language === 'ar' ? 'كيف يعمل تكامل واتساب؟' : 'How does WhatsApp integration work?', a: language === 'ar' ? 'بعد التسجيل، ستحصل على رمز QR لمسحه بواتساب. سيكون الذكاء الاصطناعي متاحاً في محادثاتك.' : 'After signing up, you\'ll receive a QR code to scan with WhatsApp. The AI will then be available in your chats.' },
    { q: language === 'ar' ? 'ما طرق الدفع المقبولة؟' : 'What payment methods do you accept?', a: language === 'ar' ? 'نقبل جميع بطاقات الائتمان والخصم عبر معالج الدفع الآمن Stripe.' : 'We accept all major credit cards and debit cards through our secure payment processor Stripe.' },
  ];

  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkle size={22} className="text-white" weight="fill" />
            </div>
            <span className="font-bold text-xl text-slate-900 font-heading">Letsm AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">{language === 'ar' ? 'المميزات' : 'Features'}</a>
            <a href="#demo" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">{language === 'ar' ? 'تجربة' : 'Demo'}</a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">{language === 'ar' ? 'الأسعار' : 'Pricing'}</a>
            <a href="#privacy" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">{language === 'ar' ? 'الخصوصية' : 'Privacy'}</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors">
              <Globe size={18} />
              <span className="text-sm font-medium hidden sm:inline">{language === 'ar' ? 'EN' : 'ع'}</span>
            </button>
            <Link to="/login" className="px-4 py-2 text-slate-700 font-medium hover:text-slate-900 transition-colors hidden sm:block">{language === 'ar' ? 'دخول' : 'Sign In'}</Link>
            <Link to="/login" className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition-all" data-testid="get-started-btn">{language === 'ar' ? 'ابدأ مجاناً' : 'Get Started'}</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50"></div>
        <div className="absolute top-40 left-10 w-72 h-72 bg-violet-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className={isRTL ? 'lg:order-2' : ''}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 mb-8">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600">{language === 'ar' ? 'مساعد شخصي ذكي' : 'AI-Powered Personal Assistant'}</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-heading leading-[1.1] mb-6">
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">{language === 'ar' ? 'حياتك،' : 'Your Life,'}</span>
                <br />
                <span className="text-slate-900">{language === 'ar' ? 'مُبسَّطة' : 'Simplified'}</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">{language === 'ar' ? 'أدِر المهام والتذكيرات والجداول من خلال المحادثة الطبيعية. Letsm AI يفهمك ويتذكر تفضيلاتك ويساعدك على البقاء منظماً.' : 'Manage tasks, reminders, schedules, and workflows through natural conversation. Letsm AI understands you, remembers your preferences, and helps you stay organized.'}</p>
              <div className="flex flex-wrap gap-4 mb-10">
                <Link to="/login" className="group inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-violet-500/30 transition-all">
                  {language === 'ar' ? 'ابدأ مجاناً' : 'Get Started Free'}
                  <ArrowRight size={20} weight="bold" className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
                <a href="#demo" className="inline-flex items-center gap-2 px-7 py-4 bg-white text-slate-700 font-semibold rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
                  <Play size={20} weight="fill" className="text-violet-600" />
                  {language === 'ar' ? 'شاهد العرض' : 'Try Demo'}
                </a>
              </div>
              <div className="flex flex-wrap gap-3">
                {features.map((feature, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }} className={`inline-flex items-center gap-2 px-4 py-2 ${feature.bg} rounded-full`}>
                    <feature.icon size={18} className={feature.color} weight="fill" />
                    <span className="text-sm font-medium text-slate-700">{feature.title}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className={`relative ${isRTL ? 'lg:order-1' : ''}`}>
              <div className="relative">
                <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl p-6 shadow-2xl shadow-slate-200/50">
                  <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80" alt="Person using Letsm AI" className="rounded-2xl w-full object-cover h-[400px]" />
                  <div className="absolute inset-6 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className={`absolute ${isRTL ? '-right-4' : '-left-4'} top-20 bg-white rounded-2xl shadow-xl p-4 max-w-[220px] border border-slate-100`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0"><ChatTeardrop size={16} className="text-violet-600" weight="fill" /></div>
                    <div><p className="text-sm font-medium text-slate-900">{language === 'ar' ? '"ذكرني بالاجتماع غداً"' : '"Remind me about the meeting tomorrow"'}</p><p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'تم إنشاء التذكير' : 'Reminder created'}</p></div>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className={`absolute ${isRTL ? '-left-4' : '-right-4'} top-1/2 bg-white rounded-2xl shadow-xl p-4 border border-slate-100`}>
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><Check size={20} className="text-green-600" weight="bold" /></div><div><p className="text-sm font-semibold text-slate-900">98%</p><p className="text-xs text-slate-500">{language === 'ar' ? 'دقة' : 'Accuracy'}</p></div></div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: language === 'ar' ? 'مستخدم نشط' : 'Active Users' },
              { value: '500K+', label: language === 'ar' ? 'مهمة مكتملة' : 'Tasks Done' },
              { value: '98%', label: language === 'ar' ? 'رضا المستخدمين' : 'Satisfaction' },
              { value: '24/7', label: language === 'ar' ? 'متاح دائماً' : 'Available' },
            ].map((stat, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="text-center">
                <p className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-heading">{stat.value}</p>
                <p className="text-slate-600 mt-2 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">{language === 'ar' ? 'المميزات' : 'Features'}</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">{language === 'ar' ? 'مميزات قوية' : 'Powerful Features'}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">{language === 'ar' ? 'كل ما تحتاجه لإدارة حياتك، مدعوم بالذكاء الاصطناعي' : 'Everything you need to manage your life, powered by AI'}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {detailedFeatures.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}
                className={`bg-white p-7 rounded-2xl border-2 border-transparent ${feature.borderColor} hover:shadow-xl hover:-translate-y-1 transition-all group`}>
                <div className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={28} className={feature.iconColor} weight="duotone" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Chat Demo Section */}
      <section id="demo" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">{language === 'ar' ? 'تجربة حية' : 'Live Demo'}</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">{language === 'ar' ? 'شاهده يعمل' : 'See It In Action'}</h2>
            <p className="text-lg text-slate-600">{language === 'ar' ? 'اختبر كيف تتحول المحادثة الطبيعية إلى إنتاجية قوية' : 'Experience how natural conversation becomes powerful productivity'}</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <div className="h-[520px] flex flex-col shadow-2xl shadow-indigo-500/10 rounded-2xl overflow-hidden border border-slate-200" data-testid="chat-demo">
                <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 text-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"><Sparkle size={20} className="text-white" weight="fill" /></div>
                    <div><h3 className="font-semibold">Letsm AI</h3><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span><p className="text-xs text-white/80">{language === 'ar' ? 'دائماً هنا للمساعدة' : 'Always here to help'}</p></div></div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
                  {demoMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.type === 'action' ? (
                        <div className="w-full bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2.5">
                          <CheckCircle size={20} className="text-green-600 flex-shrink-0" weight="fill" />
                          <span className="text-sm font-semibold text-green-800">{msg.content}</span>
                        </div>
                      ) : (
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.type === 'user' ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-tr-sm' : 'bg-white text-slate-800 shadow-md border border-slate-100 rounded-tl-sm'}`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-md border border-slate-100 rounded-tl-sm">
                        <div className="flex gap-2"><div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><Microphone size={20} /></button>
                    <input type="text" placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled />
                    <button className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full text-white shadow-lg shadow-indigo-500/25"><PaperPlaneTilt size={18} weight="fill" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Buttons */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-lg mb-2">{language === 'ar' ? 'جرّب هذه الأمثلة:' : 'Try These Examples:'}</h3>
              {demoScenarios.map((scenario, index) => (
                <button key={index} onClick={() => runScenario(index)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all hover:-translate-y-0.5 ${activeScenario === index ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200 hover:shadow-lg bg-white'}`}
                  data-testid={`demo-scenario-${index}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <scenario.icon size={20} className="text-indigo-600" weight="duotone" />
                    <p className="font-semibold text-slate-900">{scenario.label}</p>
                  </div>
                  <p className="text-sm text-slate-500">"{scenario.userMessage}"</p>
                </button>
              ))}
              <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-2"><Sparkle size={16} className="text-indigo-600" weight="fill" /><h4 className="font-bold text-indigo-900">{language === 'ar' ? 'نصيحة احترافية' : 'Pro Tip'}</h4></div>
                <p className="text-sm text-indigo-700 leading-relaxed">{language === 'ar' ? 'Letsm AI يفهم السياق ويتذكر تفضيلاتك ويتعلم من عاداتك لتقديم اقتراحات أذكى.' : 'Letsm AI understands context, remembers your preferences, and learns from your habits to provide smarter suggestions over time.'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">{language === 'ar' ? 'تكاملات' : 'Integrations'}</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">{language === 'ar' ? 'يعمل في كل مكان' : 'Works Everywhere You Do'}</h2>
            <p className="text-lg text-slate-600">{language === 'ar' ? 'تكامل سلس مع منصاتك المفضلة' : 'Seamlessly integrate with your favorite platforms'}</p>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100" data-testid="messaging-integrations">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center"><ChatTeardrop size={28} className="text-indigo-600" weight="duotone" /></div>
                <div><h3 className="text-2xl font-bold text-slate-900">{language === 'ar' ? 'المراسلة' : 'Messaging'}</h3><p className="text-sm text-slate-500">{language === 'ar' ? 'تحدث عبر تطبيقك المفضل' : 'Chat on your preferred app'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {messagingPlatforms.map((platform, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <platform.icon size={24} className="text-slate-600 group-hover:text-indigo-600 transition-colors" weight="fill" />
                      <span className="font-medium text-slate-900 text-sm">{platform.name}</span>
                    </div>
                    {!platform.available && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{language === 'ar' ? 'قريباً' : 'Soon'}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100" data-testid="calendar-integrations">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center"><Calendar size={28} className="text-purple-600" weight="duotone" /></div>
                <div><h3 className="text-2xl font-bold text-slate-900">{language === 'ar' ? 'التقويم' : 'Calendar'}</h3><p className="text-sm text-slate-500">{language === 'ar' ? 'مزامنة عبر جميع التقويمات' : 'Sync across all calendars'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {calendarPlatforms.map((platform, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-purple-50 transition-colors">
                    <span className="font-medium text-slate-900 text-sm">{platform.name}</span>
                    {!platform.available && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{language === 'ar' ? 'قريباً' : 'Soon'}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">{language === 'ar' ? 'آراء المستخدمين' : 'Testimonials'}</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">{language === 'ar' ? 'محبوب من الآلاف' : 'Loved by Thousands'}</h2>
            <p className="text-lg text-slate-600">{language === 'ar' ? 'شاهد ما يقوله مستخدمونا عن Letsm AI' : 'See what our users have to say about Letsm AI'}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="testimonials-grid">
            {testimonials.map((t, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-100">
                <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-amber-400" weight="fill" />)}</div>
                <p className="text-slate-700 mb-6 leading-relaxed text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${t.bg} rounded-full flex items-center justify-center`}><span className="text-white text-sm font-bold">{t.initials}</span></div>
                  <div><p className="font-semibold text-slate-900 text-sm">{t.name}</p><p className="text-xs text-slate-500">{t.role} @ {t.company}</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">{language === 'ar' ? 'أسعار شفافة وبسيطة' : 'Simple, Transparent Pricing'}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">{language === 'ar' ? 'اختر الخطة المناسبة لك. يمكنك الترقية أو التخفيض في أي وقت.' : 'Choose the plan that fits your needs. Upgrade or downgrade anytime.'}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}
                className={`relative rounded-3xl p-8 ${plan.highlighted ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30 scale-105' : 'bg-white border border-slate-200'}`}
                data-testid={`pricing-plan-${index}`}>
                {plan.highlighted && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-violet-600 text-sm font-bold rounded-full shadow-lg">{language === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}</div>}
                <h3 className={`text-xl font-semibold mb-1 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-white/70' : 'text-slate-500'}`}>{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  {plan.period && <span className={plan.highlighted ? 'text-white/70' : 'text-slate-500'}>{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle size={20} weight="fill" className={plan.highlighted ? 'text-white' : 'text-green-500'} /><span className={plan.highlighted ? 'text-white/90' : 'text-slate-600'}>{feature}</span></li>
                  ))}
                </ul>
                <Link to="/login" className={`block w-full py-4 text-center font-semibold rounded-full transition-all ${plan.highlighted ? 'bg-white text-violet-600 hover:shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{plan.cta}</Link>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mt-20" data-testid="faq-section">
            <h3 className="text-3xl font-bold text-slate-900 text-center mb-8 font-heading">{language === 'ar' ? 'أسئلة شائعة' : 'Frequently Asked Questions'}</h3>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full flex items-center justify-between p-5 text-left" data-testid={`faq-${index}`}>
                    <h4 className="font-semibold text-slate-900">{faq.q}</h4>
                    <CaretRight size={18} className={`text-slate-400 transition-transform ${openFaq === index ? 'rotate-90' : ''}`} />
                  </button>
                  {openFaq === index && <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6"><ShieldCheck size={32} className="text-indigo-600" weight="duotone" /></div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">{language === 'ar' ? 'خصوصيتك، أولويتنا' : 'Your Privacy, Our Priority'}</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">{language === 'ar' ? 'نؤمن أن المساعدة الذكية لا يجب أن تأتي على حساب خصوصيتك.' : 'We believe powerful AI assistance shouldn\'t come at the cost of your privacy.'}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16" data-testid="privacy-features">
            {privacyFeatures.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-100 group">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><feature.icon size={24} className="text-indigo-600" weight="duotone" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
          {/* Privacy Commitment */}
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 lg:p-10 shadow-xl">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6">{language === 'ar' ? 'التزامنا تجاهك' : 'Our Commitment to You'}</h3>
                <ul className="space-y-4">
                  {[
                    language === 'ar' ? 'لن نبيع بياناتك الشخصية لأطراف ثالثة أبداً' : 'Never sell your personal data to third parties',
                    language === 'ar' ? 'لا تتبع عبر مواقع أو تطبيقات أخرى' : 'No tracking across other websites or apps',
                    language === 'ar' ? 'تدقيقات أمنية منتظمة من خبراء مستقلين' : 'Regular security audits by independent experts',
                    language === 'ar' ? 'تقارير حوادث شفافة وتواصل فوري' : 'Transparent incident reporting and communication',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3"><div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"><Check size={14} className="text-white" weight="bold" /></div><span className="text-slate-700 leading-relaxed">{item}</span></li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full flex items-center justify-center"><ShieldCheck size={80} className="text-indigo-600" weight="duotone" /></div>
              </div>
            </div>
          </div>
          {/* Safety */}
          <div className="mt-12 p-6 bg-amber-50/80 border border-amber-200 rounded-2xl">
            <h3 className="text-lg font-bold text-amber-900 mb-3">{language === 'ar' ? 'إرشادات السلامة' : 'Safety Guidelines'}</h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li>{language === 'ar' ? '- لا تشارك كلمات المرور أو أرقام البطاقات أو بيانات حساسة' : '- Never share passwords, credit card numbers, or sensitive credentials'}</li>
              <li>{language === 'ar' ? '- نرفض طلبات الأنشطة غير القانونية أو المحتوى الضار' : '- We decline requests involving illegal activities or harmful content'}</li>
              <li>{language === 'ar' ? '- للمعاملات المالية، تحقق دائماً عبر القنوات الرسمية' : '- For financial transactions, always verify through official channels'}</li>
              <li>{language === 'ar' ? '- أبلغ فوراً عن أي سلوك مشبوه أو مخاوف أمنية' : '- Report any suspicious behavior or security concerns immediately'}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-violet-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxMC44NzUgMCAxOC03LjYyNSAxOC0xOHMtNy4xMjUtMTgtMTgtMTh6IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
            <h2 className="text-4xl sm:text-5xl font-bold text-white font-heading mb-6">{language === 'ar' ? 'ابدأ رحلة الإنتاجية اليوم' : 'Start Your Productivity Journey'}</h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">{language === 'ar' ? 'انضم لآلاف المستخدمين الذين يديرون حياتهم بذكاء مع Letsm AI' : 'Join thousands of users managing their lives smartly with Letsm AI'}</p>
            <Link to="/login" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-violet-600 font-bold text-lg rounded-full hover:shadow-2xl transition-all">
              {language === 'ar' ? 'ابدأ مجاناً الآن' : 'Get Started Free'}
              <ArrowRight size={24} weight="bold" className={isRTL ? 'rotate-180' : ''} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center"><Sparkle size={22} className="text-white" weight="fill" /></div>
              <span className="font-bold text-xl text-white font-heading">Letsm AI</span>
            </div>
            <div className="flex items-center gap-8 text-slate-400">
              <a href="#privacy" className="hover:text-white transition-colors">{language === 'ar' ? 'الخصوصية' : 'Privacy'}</a>
              <a href="#" className="hover:text-white transition-colors">{language === 'ar' ? 'الشروط' : 'Terms'}</a>
              <a href="#" className="hover:text-white transition-colors">{language === 'ar' ? 'الدعم' : 'Support'}</a>
              <a href="#" className="hover:text-white transition-colors">{language === 'ar' ? 'تواصل' : 'Contact'}</a>
            </div>
            <p className="text-slate-500 text-sm">2026 Letsm AI. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
