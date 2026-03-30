import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatApi } from '../lib/api';
import { PaperPlaneRight, Plus, Trash, ChatCircle, Robot, User, SpinnerGap, Microphone, Stop } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Speech Recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in your browser settings.');
        } else if (event.error === 'no-speech') {
          toast.info('No speech detected. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Listening... Speak now', { duration: 2000 });
    }
  }, [isListening]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    setLoading(true);
    try {
      const response = await chatApi.getMessages(conversationId);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg = {
      message_id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await chatApi.sendMessage(userMessage, activeConversation);
      const aiMessage = response.data;

      // Store the user message properly with actual ID
      const finalUserMsg = {
        message_id: `user-${Date.now()}`,
        conversation_id: aiMessage.conversation_id,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      };

      // Update messages: remove temp, add final user msg and AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.message_id !== tempUserMsg.message_id);
        return [...filtered, finalUserMsg, aiMessage];
      });

      // Update conversation list and set active conversation
      if (!activeConversation) {
        setActiveConversation(aiMessage.conversation_id);
      }
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.message_id !== tempUserMsg.message_id));
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(convId);
      if (activeConversation === convId) {
        setActiveConversation(null);
        setMessages([]);
      }
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex" data-testid="chat-page">
      {/* Conversations Sidebar */}
      <div className="w-72 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2.5 font-semibold hover:bg-[#001A7A] transition-colors"
            data-testid="new-chat-button"
          >
            <Plus size={20} weight="bold" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.conversation_id}
              onClick={() => setActiveConversation(conv.conversation_id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                activeConversation === conv.conversation_id
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'hover:bg-white hover:border hover:border-slate-200'
              }`}
              data-testid={`conversation-${conv.conversation_id}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ChatCircle size={18} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate">{conv.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(conv.conversation_id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
                data-testid={`delete-conversation-${conv.conversation_id}`}
              >
                <Trash size={16} className="text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Robot size={32} className="text-[#002FA7]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 font-heading mb-2">
                How can I help you today?
              </h2>
              <p className="text-slate-500 max-w-md">
                I'm Letsm AI, your intelligent assistant. Ask me anything about tasks, reminders, or get help with your daily activities.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <SpinnerGap size={24} className="text-[#002FA7] animate-spin" />
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={msg.message_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start gap-3 max-w-[85%] ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-slate-100' : 'bg-[#002FA7]'
                  }`}>
                    {msg.role === 'user' ? (
                      <User size={16} className="text-slate-600" />
                    ) : (
                      <Robot size={16} className="text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-white border border-slate-200 shadow-sm'
                        : 'bg-slate-50'
                    }`}
                    data-testid={`message-${msg.message_id}`}
                  >
                    <p className="text-slate-700 whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-8 h-8 rounded-full bg-[#002FA7] flex items-center justify-center">
                <Robot size={16} className="text-white" />
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <SpinnerGap size={16} className="text-[#002FA7] animate-spin" />
                  <span className="text-slate-500 text-sm">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white p-4 relative z-50">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            {/* Voice Input Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-md transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
                data-testid="voice-input-button"
              >
                {isListening ? (
                  <Stop size={20} weight="bold" />
                ) : (
                  <Microphone size={20} weight="bold" />
                )}
              </button>
            )}
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Type your message or use voice input..."}
              className={`flex-1 px-4 py-2.5 bg-white border rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-all ${
                isListening ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
              disabled={sending}
              data-testid="chat-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-[#002FA7] text-white rounded-md p-2.5 hover:bg-[#001A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-50"
              data-testid="send-message-button"
            >
              <PaperPlaneRight size={20} weight="bold" />
            </button>
          </form>
          
          {/* Voice Input Hint */}
          {speechSupported && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              💡 Try saying: "Create task buy groceries" or "Show my tasks"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
