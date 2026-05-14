import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // Navigation
    aiChat: 'AI Chat',
    tasks: 'Tasks',
    reminders: 'Reminders',
    calendar: 'Calendar',
    team: 'Team',
    statistics: 'Statistics',
    imageAnalysis: 'Image Analysis',
    whatsApp: 'WhatsApp',
    profile: 'Profile',
    adminPanel: 'Admin Panel',
    signOut: 'Sign Out',
    
    // Auth
    welcomeBack: 'Welcome back',
    createAccount: 'Create account',
    signInContinue: 'Sign in to continue to Letsm AI',
    getStarted: 'Get started with Letsm AI',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Sign up',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    continueWithGoogle: 'Continue with Google',
    or: 'or',
    
    // Chat
    newChat: 'New Chat',
    typeMessage: 'Type your message...',
    howCanIHelp: 'How can I help you today?',
    imLetsmAI: "I'm Letsm AI, your intelligent assistant.",
    thinking: 'Thinking...',
    noConversations: 'No conversations yet',
    
    // Tasks
    addTask: 'Add Task',
    createNewTask: 'Create New Task',
    taskTitle: 'Task Title',
    description: 'Description',
    dueDate: 'Due Date',
    priority: 'Priority',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    all: 'All',
    pending: 'Pending',
    completed: 'Completed',
    noTasks: 'No tasks found',
    createFirstTask: 'Create your first task',
    cancel: 'Cancel',
    createTask: 'Create Task',
    
    // Reminders
    addReminder: 'Add Reminder',
    createNewReminder: 'Create New Reminder',
    reminderTitle: 'Reminder Title',
    date: 'Date',
    time: 'Time',
    repeat: 'Repeat',
    once: 'Once',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    noReminders: 'No reminders set',
    createFirstReminder: 'Create your first reminder',
    createReminder: 'Create Reminder',
    
    // Calendar
    addEvent: 'Add Event',
    createNewEvent: 'Create New Event',
    eventTitle: 'Event Title',
    startTime: 'Start Time',
    endTime: 'End Time',
    allDay: 'All day event',
    noEvents: 'No events for this day',
    createEvent: 'Create Event',
    
    // Statistics
    statisticsTitle: 'Statistics',
    trackProductivity: 'Track your productivity and achievements',
    currentStreak: 'Current Streak',
    days: 'days',
    best: 'Best',
    tasksCompleted: 'Tasks Completed',
    completionRate: 'completion rate',
    pendingTasks: 'Pending Tasks',
    highPriority: 'high priority',
    aiConversations: 'AI Conversations',
    messagesThisWeek: 'messages this week',
    activeReminders: 'Active Reminders',
    totalSet: 'total set',
    weeklyActivity: 'Weekly Activity',
    quickStats: 'Quick Stats',
    completedThisWeek: 'Completed This Week',
    upcomingEvents: 'Upcoming Events',
    totalMessages: 'Total Messages',
    productivityScore: 'Productivity Score',
    
    // WhatsApp
    whatsAppIntegration: 'WhatsApp Integration',
    connectWhatsApp: 'Connect your WhatsApp to receive AI assistance',
    connectionStatus: 'Connection Status',
    connected: 'Connected',
    notConnected: 'Not connected',
    scanQR: 'Scan the QR code with WhatsApp to connect your account',
    howToConnect: 'How to connect:',
    
    // Profile
    profileTitle: 'Profile',
    manageAccount: 'Manage your account settings',
    edit: 'Edit',
    save: 'Save',
    accountInfo: 'Account Information',
    userId: 'User ID',
    accountCreated: 'Account Created',
    
    // Notifications
    notifications: 'Notifications',
    markAllRead: 'Mark all read',
    noNotifications: 'No notifications',
    
    // Voice
    voiceHint: 'Try saying: "Create task buy groceries" or "Show my tasks"',
    listening: 'Listening...',
  },
  ar: {
    // Navigation
    aiChat: 'المحادثة الذكية',
    tasks: 'المهام',
    reminders: 'التذكيرات',
    calendar: 'التقويم',
    team: 'الفريق',
    statistics: 'الإحصائيات',
    imageAnalysis: 'تحليل الصور',
    whatsApp: 'واتساب',
    profile: 'الملف الشخصي',
    adminPanel: 'لوحة الإدارة',
    signOut: 'تسجيل الخروج',
    
    // Auth
    welcomeBack: 'مرحباً بعودتك',
    createAccount: 'إنشاء حساب',
    signInContinue: 'سجل دخولك للمتابعة إلى Letsm AI',
    getStarted: 'ابدأ مع Letsm AI',
    fullName: 'الاسم الكامل',
    emailAddress: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    dontHaveAccount: 'ليس لديك حساب؟',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    continueWithGoogle: 'المتابعة مع Google',
    or: 'أو',
    
    // Chat
    newChat: 'محادثة جديدة',
    typeMessage: 'اكتب رسالتك...',
    howCanIHelp: 'كيف يمكنني مساعدتك اليوم؟',
    imLetsmAI: 'أنا Letsm AI، مساعدك الذكي.',
    thinking: 'جاري التفكير...',
    noConversations: 'لا توجد محادثات بعد',
    
    // Tasks
    addTask: 'إضافة مهمة',
    createNewTask: 'إنشاء مهمة جديدة',
    taskTitle: 'عنوان المهمة',
    description: 'الوصف',
    dueDate: 'تاريخ الاستحقاق',
    priority: 'الأولوية',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
    all: 'الكل',
    pending: 'معلقة',
    completed: 'مكتملة',
    noTasks: 'لا توجد مهام',
    createFirstTask: 'أنشئ مهمتك الأولى',
    cancel: 'إلغاء',
    createTask: 'إنشاء المهمة',
    
    // Reminders
    addReminder: 'إضافة تذكير',
    createNewReminder: 'إنشاء تذكير جديد',
    reminderTitle: 'عنوان التذكير',
    date: 'التاريخ',
    time: 'الوقت',
    repeat: 'التكرار',
    once: 'مرة واحدة',
    daily: 'يومياً',
    weekly: 'أسبوعياً',
    monthly: 'شهرياً',
    noReminders: 'لا توجد تذكيرات',
    createFirstReminder: 'أنشئ تذكيرك الأول',
    createReminder: 'إنشاء التذكير',
    
    // Calendar
    addEvent: 'إضافة حدث',
    createNewEvent: 'إنشاء حدث جديد',
    eventTitle: 'عنوان الحدث',
    startTime: 'وقت البداية',
    endTime: 'وقت النهاية',
    allDay: 'حدث طوال اليوم',
    noEvents: 'لا توجد أحداث لهذا اليوم',
    createEvent: 'إنشاء الحدث',
    
    // Statistics
    statisticsTitle: 'الإحصائيات',
    trackProductivity: 'تتبع إنتاجيتك وإنجازاتك',
    currentStreak: 'السلسلة الحالية',
    days: 'أيام',
    best: 'الأفضل',
    tasksCompleted: 'المهام المكتملة',
    completionRate: 'نسبة الإنجاز',
    pendingTasks: 'المهام المعلقة',
    highPriority: 'أولوية عالية',
    aiConversations: 'المحادثات الذكية',
    messagesThisWeek: 'رسالة هذا الأسبوع',
    activeReminders: 'التذكيرات النشطة',
    totalSet: 'إجمالي التذكيرات',
    weeklyActivity: 'النشاط الأسبوعي',
    quickStats: 'إحصائيات سريعة',
    completedThisWeek: 'مكتمل هذا الأسبوع',
    upcomingEvents: 'الأحداث القادمة',
    totalMessages: 'إجمالي الرسائل',
    productivityScore: 'درجة الإنتاجية',
    
    // WhatsApp
    whatsAppIntegration: 'تكامل واتساب',
    connectWhatsApp: 'اربط واتساب لتلقي المساعدة الذكية',
    connectionStatus: 'حالة الاتصال',
    connected: 'متصل',
    notConnected: 'غير متصل',
    scanQR: 'امسح رمز QR بواتساب للاتصال',
    howToConnect: 'كيفية الاتصال:',
    
    // Profile
    profileTitle: 'الملف الشخصي',
    manageAccount: 'إدارة إعدادات حسابك',
    edit: 'تعديل',
    save: 'حفظ',
    accountInfo: 'معلومات الحساب',
    userId: 'معرف المستخدم',
    accountCreated: 'تاريخ الإنشاء',
    
    // Notifications
    notifications: 'الإشعارات',
    markAllRead: 'تحديد الكل كمقروء',
    noNotifications: 'لا توجد إشعارات',
    
    // Voice
    voiceHint: 'جرب قول: "أنشئ مهمة شراء البقالة" أو "اعرض مهامي"',
    listening: 'جاري الاستماع...',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    if (saved) return saved;
    // Auto-detect Arabic
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ar') ? 'ar' : 'en';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    localStorage.setItem('language', language);
    // Apply RTL to document
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = (key) => {
    return translations[language][key] || translations.en[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      isRTL,
      t,
      toggleLanguage
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
