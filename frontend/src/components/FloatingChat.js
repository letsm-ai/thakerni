import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatTeardrop, X, PaperPlaneTilt, Sparkle, ArrowRight, Trash } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = 'letsm_guest_chat';

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - data.savedAt > 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
};

const FloatingChat = ({ language, isRTL }) => {
  const saved = useRef(loadSaved());
  const [isOpen, setIsOpen] = useState(false);
  const welcomeMsg = {
    id: 1, role: 'ai',
    content: language === 'ar'
      ? 'مرحباً! أنا Letsm AI. جرّب أن تسألني أي شيء — أستطيع مساعدتك في المهام والتذكيرات والإنتاجية!'
      : 'Hi! I\'m Letsm AI. Try asking me anything — I can help with tasks, reminders, and productivity!'
  };
  const [messages, setMessages] = useState(saved.current?.messages || [welcomeMsg]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(saved.current?.sessionId || null);
  const [msgCount, setMsgCount] = useState(saved.current?.msgCount || 0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Persist to localStorage on every change
  useEffect(() => {
    if (messages.length > 1 || sessionId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages, sessionId, msgCount, savedAt: Date.now()
      }));
    }
  }, [messages, sessionId, msgCount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([welcomeMsg]);
    setSessionId(null);
    setMsgCount(0);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setMsgCount(prev => prev + 1);

    try {
      const res = await axios.post(`${API_URL}/api/guest/chat`, {
        message: text, session_id: sessionId
      });
      if (res.data.session_id) setSessionId(res.data.session_id);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        content: res.data.response, limited: res.data.limited
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        content: language === 'ar' ? 'عذراً، حدث خطأ. سجّل للحصول على تجربة كاملة!' : 'Sorry, something went wrong. Sign up for the full experience!'
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, language]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-full shadow-2xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-105 transition-all flex items-center justify-center group"
          data-testid="floating-chat-button">
          <ChatTeardrop size={28} weight="fill" className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden border border-slate-200"
          data-testid="floating-chat-window">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkle size={20} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Letsm AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <p className="text-xs text-white/80">{language === 'ar' ? 'متصل الآن' : 'Online now'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors" title="Clear chat" data-testid="clear-chat-button">
                <Trash size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors" data-testid="close-chat-button">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/80 to-white">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 rounded-tl-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}
            {msgCount >= 3 && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                <p className="text-xs text-indigo-700 mb-2">
                  {language === 'ar' ? 'تمتع بمحادثات غير محدودة وميزات متقدمة!' : 'Enjoy unlimited conversations and advanced features!'}
                </p>
                <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-full hover:bg-violet-700 transition-colors" data-testid="chat-signup-cta">
                  {language === 'ar' ? 'سجّل مجاناً' : 'Sign Up Free'}
                  <ArrowRight size={12} weight="bold" className={isRTL ? 'rotate-180' : ''} />
                </Link>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading} data-testid="floating-chat-input" />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:shadow-none flex-shrink-0"
                data-testid="floating-chat-send">
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">{language === 'ar' ? 'مدعوم بـ GPT-5.2' : 'Powered by GPT-5.2'}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChat;
