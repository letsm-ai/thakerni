import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { 
  Robot, 
  CheckCircle, 
  Bell, 
  Calendar, 
  WhatsappLogo, 
  Microphone,
  ChartBar,
  Lightning,
  Globe,
  ShieldCheck,
  ArrowRight,
  Star,
  Play
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const Landing = () => {
  const { language, toggleLanguage, isRTL } = useLanguage();

  const features = [
    {
      icon: Robot,
      title: language === 'ar' ? 'محادثة ذكية' : 'AI Chat Assistant',
      description: language === 'ar' 
        ? 'تحدث مع مساعدك الذكي بأي لغة. أنشئ مهام وتذكيرات بالصوت أو الكتابة.'
        : 'Chat with your AI assistant in any language. Create tasks and reminders with voice or text.',
    },
    {
      icon: CheckCircle,
      title: language === 'ar' ? 'إدارة المهام' : 'Task Management',
      description: language === 'ar'
        ? 'نظم مهامك بالأولويات والمواعيد. تتبع إنجازاتك بسهولة.'
        : 'Organize tasks with priorities and due dates. Track your accomplishments easily.',
    },
    {
      icon: Bell,
      title: language === 'ar' ? 'تذكيرات ذكية' : 'Smart Reminders',
      description: language === 'ar'
        ? 'لا تنسَ أي شيء. تذكيرات فورية ومتكررة حسب احتياجاتك.'
        : 'Never forget anything. Instant and recurring reminders based on your needs.',
    },
    {
      icon: Calendar,
      title: language === 'ar' ? 'تقويم متكامل' : 'Integrated Calendar',
      description: language === 'ar'
        ? 'اعرض جميع أحداثك ومهامك في مكان واحد.'
        : 'View all your events and tasks in one place.',
    },
    {
      icon: WhatsappLogo,
      title: language === 'ar' ? 'تكامل واتساب' : 'WhatsApp Integration',
      description: language === 'ar'
        ? 'أدر مهامك وتذكيراتك مباشرة من واتساب.'
        : 'Manage your tasks and reminders directly from WhatsApp.',
    },
    {
      icon: Microphone,
      title: language === 'ar' ? 'إدخال صوتي' : 'Voice Input',
      description: language === 'ar'
        ? 'تحدث بدلاً من الكتابة. يدعم العربية والإنجليزية.'
        : 'Speak instead of typing. Supports Arabic and English.',
    },
  ];

  const stats = [
    { value: '10K+', label: language === 'ar' ? 'مستخدم نشط' : 'Active Users' },
    { value: '500K+', label: language === 'ar' ? 'مهمة مكتملة' : 'Tasks Completed' },
    { value: '99.9%', label: language === 'ar' ? 'وقت التشغيل' : 'Uptime' },
    { value: '24/7', label: language === 'ar' ? 'دعم متواصل' : 'Support' },
  ];

  const plans = [
    {
      name: language === 'ar' ? 'مجاني' : 'Free',
      price: '$0',
      period: language === 'ar' ? '/شهرياً' : '/month',
      features: language === 'ar' 
        ? ['5 مهام', '3 محادثات يومياً', 'تذكيرات أساسية']
        : ['5 Tasks', '3 Conversations/day', 'Basic Reminders'],
      cta: language === 'ar' ? 'ابدأ مجاناً' : 'Start Free',
      highlighted: false,
    },
    {
      name: language === 'ar' ? 'احترافي' : 'Pro',
      price: '$9.99',
      period: language === 'ar' ? '/شهرياً' : '/month',
      features: language === 'ar'
        ? ['مهام غير محدودة', 'محادثات غير محدودة', 'تذكيرات متقدمة', 'إحصائيات الإنتاجية', 'إدخال صوتي']
        : ['Unlimited Tasks', 'Unlimited Conversations', 'Advanced Reminders', 'Productivity Stats', 'Voice Input'],
      cta: language === 'ar' ? 'ابدأ الآن' : 'Get Started',
      highlighted: true,
    },
    {
      name: language === 'ar' ? 'أعمال' : 'Business',
      price: '$29.99',
      period: language === 'ar' ? '/شهرياً' : '/month',
      features: language === 'ar'
        ? ['كل ميزات Pro', 'تكامل واتساب', 'فريق عمل', 'API مخصص', 'دعم أولوية']
        : ['All Pro Features', 'WhatsApp Integration', 'Team Collaboration', 'Custom API', 'Priority Support'],
      cta: language === 'ar' ? 'تواصل معنا' : 'Contact Us',
      highlighted: false,
    },
  ];

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/7432755b702d2a2a26f7a6ef3b6c0c1c2e834acae24098a23273963d9cd5719c.png"
              alt="Letsm AI"
              className="h-9 w-auto"
            />
            <span className="font-bold text-xl text-slate-900 font-heading">Letsm AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Globe size={20} />
              <span className="text-sm font-medium">{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            
            <Link
              to="/login"
              className="px-4 py-2 text-slate-700 font-medium hover:text-slate-900 transition-colors"
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
            
            <Link
              to="/login"
              className="px-5 py-2.5 bg-[#002FA7] text-white font-semibold rounded-lg hover:bg-[#001A7A] transition-colors"
            >
              {language === 'ar' ? 'ابدأ مجاناً' : 'Start Free'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7]/10 rounded-full mb-6">
                <Lightning size={16} className="text-[#002FA7]" weight="fill" />
                <span className="text-sm font-medium text-[#002FA7]">
                  {language === 'ar' ? 'مدعوم بـ GPT-5.2' : 'Powered by GPT-5.2'}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 font-heading leading-tight mb-6">
                {language === 'ar' ? (
                  <>مساعدك الذكي<br /><span className="text-[#002FA7]">لإدارة حياتك</span></>
                ) : (
                  <>Your AI Assistant<br /><span className="text-[#002FA7]">For Life Management</span></>
                )}
              </h1>
              
              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                {language === 'ar'
                  ? 'أنشئ مهام، ضع تذكيرات، ونظم جدولك بمحادثة بسيطة. يدعم العربية والإنجليزية بالصوت والنص.'
                  : 'Create tasks, set reminders, and organize your schedule with a simple conversation. Supports Arabic and English with voice and text.'}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#002FA7] text-white font-semibold rounded-lg hover:bg-[#001A7A] transition-colors"
                >
                  {language === 'ar' ? 'ابدأ مجاناً' : 'Start Free'}
                  <ArrowRight size={20} weight="bold" className={isRTL ? 'rotate-180' : ''} />
                </Link>
                
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <Play size={20} weight="fill" />
                  {language === 'ar' ? 'شاهد الفيديو' : 'Watch Demo'}
                </button>
              </div>
              
              {/* Trust badges */}
              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={16} className="text-yellow-500" weight="fill" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">
                    {language === 'ar' ? '+10,000 مستخدم سعيد' : '10,000+ Happy Users'}
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Hero Image/Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-slate-100 rounded-2xl p-4 shadow-2xl">
                <img
                  src="https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/dd0db0f9b8f8070012fd71ed7d86b5bf320357e1ab28149f982806de691b7953.png"
                  alt="Letsm AI Dashboard"
                  className="rounded-lg w-full"
                />
              </div>
              
              {/* Floating cards */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`absolute -${isRTL ? 'right' : 'left'}-4 top-1/4 bg-white rounded-lg shadow-lg p-4 border border-slate-200`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" weight="fill" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {language === 'ar' ? 'مهمة مكتملة!' : 'Task Completed!'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'ar' ? 'اتصل بالعميل' : 'Call the client'}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className={`absolute -${isRTL ? 'left' : 'right'}-4 bottom-1/4 bg-white rounded-lg shadow-lg p-4 border border-slate-200`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#002FA7]/10 rounded-full flex items-center justify-center">
                    <Bell size={20} className="text-[#002FA7]" weight="fill" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {language === 'ar' ? 'تذكير: اجتماع' : 'Reminder: Meeting'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'ar' ? 'بعد 15 دقيقة' : 'In 15 minutes'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-[#002FA7] font-heading">{stat.value}</p>
                <p className="text-slate-600 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading mb-4">
              {language === 'ar' ? 'كل ما تحتاجه في مكان واحد' : 'Everything You Need in One Place'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'أدوات ذكية لإدارة وقتك ومهامك بكفاءة عالية'
                : 'Smart tools to manage your time and tasks efficiently'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-[#002FA7]/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-[#002FA7]/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon size={24} className="text-[#002FA7]" weight="duotone" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading mb-4">
              {language === 'ar' ? 'خطط تناسب الجميع' : 'Plans for Everyone'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'ابدأ مجاناً وارتقِ عندما تحتاج المزيد'
                : 'Start free and upgrade when you need more'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`bg-white rounded-2xl p-8 ${
                  plan.highlighted 
                    ? 'border-2 border-[#002FA7] shadow-xl relative' 
                    : 'border border-slate-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#002FA7] text-white text-sm font-semibold rounded-full">
                    {language === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
                  </div>
                )}
                
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle size={20} className="text-green-500" weight="fill" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  to="/login"
                  className={`block w-full py-3 text-center font-semibold rounded-lg transition-colors ${
                    plan.highlighted
                      ? 'bg-[#002FA7] text-white hover:bg-[#001A7A]'
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
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading mb-4">
              {language === 'ar' ? 'ابدأ إنتاجيتك اليوم' : 'Start Your Productivity Today'}
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              {language === 'ar'
                ? 'انضم لآلاف المستخدمين الذين يديرون حياتهم بذكاء'
                : 'Join thousands of users managing their lives smartly'}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#002FA7] text-white font-semibold text-lg rounded-lg hover:bg-[#001A7A] transition-colors"
            >
              {language === 'ar' ? 'ابدأ مجاناً الآن' : 'Start Free Now'}
              <ArrowRight size={24} weight="bold" className={isRTL ? 'rotate-180' : ''} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/7432755b702d2a2a26f7a6ef3b6c0c1c2e834acae24098a23273963d9cd5719c.png"
                alt="Letsm AI"
                className="h-8 w-auto brightness-0 invert"
              />
              <span className="font-bold text-lg font-heading">Letsm AI</span>
            </div>
            
            <div className="flex items-center gap-6 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'الخصوصية' : 'Privacy'}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'الشروط' : 'Terms'}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {language === 'ar' ? 'تواصل معنا' : 'Contact'}
              </a>
            </div>
            
            <p className="text-slate-400 text-sm">
              © 2026 Letsm AI. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
