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
  Sparkle
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const Landing = () => {
  const { language, toggleLanguage, isRTL } = useLanguage();

  const features = [
    {
      icon: ChatTeardrop,
      title: language === 'ar' ? 'لغة طبيعية' : 'Natural Language',
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      icon: Calendar,
      title: language === 'ar' ? 'جدولة ذكية' : 'Smart Scheduling',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      icon: Brain,
      title: language === 'ar' ? 'وعي سياقي' : 'Context-Aware',
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      icon: ShieldCheck,
      title: language === 'ar' ? 'الخصوصية أولاً' : 'Privacy-First',
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
  ];

  const detailedFeatures = [
    {
      icon: ChatTeardrop,
      title: language === 'ar' ? 'تفاعل بلغتك الطبيعية' : 'Interact Naturally',
      description: language === 'ar' 
        ? 'تحدث مع Letsm AI كما تتحدث مع صديق. يفهم السياق ويتذكر تفضيلاتك.'
        : 'Talk to Letsm AI like you would to a friend. It understands context and remembers your preferences.',
    },
    {
      icon: Calendar,
      title: language === 'ar' ? 'إدارة ذكية للمهام' : 'Smart Task Management',
      description: language === 'ar'
        ? 'أنشئ مهام وتذكيرات بجملة واحدة. "ذكرني بالاجتماع غداً الساعة 3"'
        : 'Create tasks and reminders with a single sentence. "Remind me about the meeting tomorrow at 3"',
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'تذكيرات لا تُنسى' : 'Never Miss a Reminder',
      description: language === 'ar'
        ? 'إشعارات فورية عبر التطبيق والواتساب. ابقَ على اطلاع دائم.'
        : 'Instant notifications via app and WhatsApp. Stay always on track.',
    },
    {
      icon: Sparkle,
      title: language === 'ar' ? 'مدعوم بـ GPT-5.2' : 'Powered by GPT-5.2',
      description: language === 'ar'
        ? 'أحدث تقنيات الذكاء الاصطناعي لفهم أعمق ومساعدة أذكى.'
        : 'Latest AI technology for deeper understanding and smarter assistance.',
    },
  ];

  const plans = [
    {
      name: language === 'ar' ? 'مجاني' : 'Free',
      price: '$0',
      features: language === 'ar' 
        ? ['5 مهام نشطة', '3 محادثات يومياً', 'تذكيرات أساسية', 'دعم البريد']
        : ['5 Active Tasks', '3 Conversations/day', 'Basic Reminders', 'Email Support'],
      cta: language === 'ar' ? 'ابدأ مجاناً' : 'Start Free',
      highlighted: false,
    },
    {
      name: language === 'ar' ? 'احترافي' : 'Pro',
      price: '$9.99',
      period: language === 'ar' ? '/شهرياً' : '/mo',
      features: language === 'ar'
        ? ['مهام غير محدودة', 'محادثات غير محدودة', 'إدخال صوتي', 'إحصائيات متقدمة', 'أولوية الدعم']
        : ['Unlimited Tasks', 'Unlimited Conversations', 'Voice Input', 'Advanced Analytics', 'Priority Support'],
      cta: language === 'ar' ? 'اشترك الآن' : 'Subscribe Now',
      highlighted: true,
    },
    {
      name: language === 'ar' ? 'أعمال' : 'Business',
      price: '$29.99',
      period: language === 'ar' ? '/شهرياً' : '/mo',
      features: language === 'ar'
        ? ['كل ميزات Pro', 'تكامل واتساب', 'فريق حتى 10 أعضاء', 'API مخصص', 'مدير حساب']
        : ['All Pro Features', 'WhatsApp Integration', 'Team up to 10', 'Custom API', 'Account Manager'],
      cta: language === 'ar' ? 'تواصل معنا' : 'Contact Sales',
      highlighted: false,
    },
  ];

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
            <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              {language === 'ar' ? 'المميزات' : 'Features'}
            </a>
            <a href="#demo" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              {language === 'ar' ? 'تجربة' : 'Demo'}
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              {language === 'ar' ? 'الأسعار' : 'Pricing'}
            </a>
            <a href="#privacy" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              {language === 'ar' ? 'الخصوصية' : 'Privacy'}
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Globe size={18} />
              <span className="text-sm font-medium hidden sm:inline">{language === 'ar' ? 'EN' : 'ع'}</span>
            </button>
            
            <Link
              to="/login"
              className="px-4 py-2 text-slate-700 font-medium hover:text-slate-900 transition-colors hidden sm:block"
            >
              {language === 'ar' ? 'دخول' : 'Sign In'}
            </Link>
            
            <Link
              to="/login"
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              {language === 'ar' ? 'ابدأ مجاناً' : 'Get Started'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-100/50 to-transparent"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-40 left-10 w-72 h-72 bg-violet-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={isRTL ? 'lg:order-2' : ''}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 mb-8">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600">
                  {language === 'ar' ? 'مساعد شخصي ذكي' : 'AI-Powered Personal Assistant'}
                </span>
              </div>
              
              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-heading leading-[1.1] mb-6">
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {language === 'ar' ? 'حياتك،' : 'Your Life,'}
                </span>
                <br />
                <span className="text-slate-900">
                  {language === 'ar' ? 'مُبسَّطة' : 'Simplified'}
                </span>
              </h1>
              
              {/* Subheading */}
              <p className="text-xl text-slate-600 mb-8 max-w-lg leading-relaxed">
                {language === 'ar'
                  ? 'تعرّف على Letsm AI - مساعدك الذكي الذي يدير مهامك، تذكيراتك، وجدولك من خلال محادثة طبيعية.'
                  : 'Meet Letsm AI - your intelligent assistant that manages your tasks, reminders, and schedule through natural conversation.'}
              </p>
              
              {/* CTAs */}
              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-violet-500/30 transition-all"
                >
                  {language === 'ar' ? 'ابدأ مجاناً' : 'Get Started Free'}
                  <ArrowRight size={20} weight="bold" className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </Link>
                
                <button className="inline-flex items-center gap-2 px-7 py-4 bg-white text-slate-700 font-semibold rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
                  <Play size={20} weight="fill" className="text-violet-600" />
                  {language === 'ar' ? 'شاهد العرض' : 'Try Demo'}
                </button>
              </div>
              
              {/* Feature Tags */}
              <div className="flex flex-wrap gap-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className={`inline-flex items-center gap-2 px-4 py-2 ${feature.bg} rounded-full`}
                  >
                    <feature.icon size={18} className={feature.color} weight="fill" />
                    <span className="text-sm font-medium text-slate-700">{feature.title}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Right - Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`relative ${isRTL ? 'lg:order-1' : ''}`}
            >
              {/* Main Image Container */}
              <div className="relative">
                <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl p-6 shadow-2xl shadow-slate-200/50">
                  <img
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80"
                    alt="Person using Letsm AI"
                    className="rounded-2xl w-full object-cover h-[400px]"
                  />
                  
                  {/* Overlay Chat Interface */}
                  <div className="absolute inset-6 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                
                {/* Floating Chat Bubbles */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className={`absolute ${isRTL ? '-right-4' : '-left-4'} top-20 bg-white rounded-2xl shadow-xl p-4 max-w-[220px] border border-slate-100`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ChatTeardrop size={16} className="text-violet-600" weight="fill" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {language === 'ar' ? '"ذكرني بالاجتماع غداً"' : '"Remind me about the meeting tomorrow"'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'ar' ? 'تم إنشاء التذكير ✓' : 'Reminder created ✓'}
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className={`absolute ${isRTL ? '-left-4' : '-right-4'} top-1/2 bg-white rounded-2xl shadow-xl p-4 border border-slate-100`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check size={20} className="text-green-600" weight="bold" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">98%</p>
                      <p className="text-xs text-slate-500">{language === 'ar' ? 'دقة الفهم' : 'Accuracy'}</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className={`absolute ${isRTL ? 'left-10' : 'right-10'} -bottom-6 bg-white rounded-2xl shadow-xl p-4 border border-slate-100`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar size={20} className="text-blue-600" weight="fill" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{language === 'ar' ? 'اجتماع الفريق' : 'Team Meeting'}</p>
                      <p className="text-xs text-slate-500">{language === 'ar' ? 'تمت المزامنة' : 'Synced'}</p>
                    </div>
                  </div>
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
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-heading">
                  {stat.value}
                </p>
                <p className="text-slate-600 mt-2 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">
                {language === 'ar' ? 'كل ما تحتاجه' : 'Everything You Need'}
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                {language === 'ar'
                  ? 'أدوات ذكية مصممة لتبسيط حياتك اليومية'
                  : 'Smart tools designed to simplify your daily life'}
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {detailedFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/5 transition-all group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon size={28} className="text-violet-600" weight="duotone" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-heading mb-4">
                {language === 'ar' ? 'خطط مرنة' : 'Flexible Plans'}
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                {language === 'ar'
                  ? 'ابدأ مجاناً وارتقِ عندما تحتاج المزيد'
                  : 'Start free and upgrade as you grow'}
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-3xl p-8 ${
                  plan.highlighted 
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30 scale-105' 
                    : 'bg-white border border-slate-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-violet-600 text-sm font-bold rounded-full shadow-lg">
                    {language === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
                  </div>
                )}
                
                <h3 className={`text-xl font-semibold mb-2 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={plan.highlighted ? 'text-white/70' : 'text-slate-500'}>
                      {plan.period}
                    </span>
                  )}
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle 
                        size={20} 
                        weight="fill"
                        className={plan.highlighted ? 'text-white' : 'text-green-500'} 
                      />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-slate-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  to="/login"
                  className={`block w-full py-4 text-center font-semibold rounded-full transition-all ${
                    plan.highlighted
                      ? 'bg-white text-violet-600 hover:shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-violet-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxMC44NzUgMCAxOC03LjYyNSAxOC0xOHMtNy4xMjUtMTgtMTgtMTh6IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white font-heading mb-6">
              {language === 'ar' ? 'ابدأ رحلة الإنتاجية اليوم' : 'Start Your Productivity Journey'}
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'انضم لآلاف المستخدمين الذين يديرون حياتهم بذكاء مع Letsm AI'
                : 'Join thousands of users managing their lives smartly with Letsm AI'}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-violet-600 font-bold text-lg rounded-full hover:shadow-2xl transition-all"
            >
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
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Sparkle size={22} className="text-white" weight="fill" />
              </div>
              <span className="font-bold text-xl text-white font-heading">Letsm AI</span>
            </div>
            
            <div className="flex items-center gap-8 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'الخصوصية' : 'Privacy'}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'الشروط' : 'Terms'}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'الدعم' : 'Support'}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'تواصل' : 'Contact'}
              </a>
            </div>
            
            <p className="text-slate-500 text-sm">
              © 2026 Letsm AI. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
