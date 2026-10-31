import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ExternalLink,
  MapPin,
  MessageSquare,
  Navigation,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: { uri?: string; title?: string; address?: string }[];
  isMapsGrounded?: boolean;
}

interface GeminiChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialMode?: 'chat' | 'maps';
}

export const GeminiChatbotDrawer: React.FC<GeminiChatbotDrawerProps> = ({
  isOpen,
  onClose,
  initialQuery,
  initialMode = 'chat',
}) => {
  const { subscriptions, invoices, customers, discountRules } = useApp();

  const [mode, setMode] = useState<'chat' | 'maps'>(initialMode);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: `Hello! I'm your Brightloop Intelligence Copilot powered by Gemini.
I can analyze your recurring revenue metrics, recommend volume discount rules, draft dunning notices, or query verified Google Maps place data for customer branches. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery) {
      setInputText(initialQuery);
      if (initialMode) setMode(initialMode);
    }
  }, [initialQuery, initialMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const quickPrompts = [
    {
      label: 'Analyze Overdue Invoices',
      text: 'Analyze our current overdue invoice INV-2026-0082 and suggest a friendly yet effective dunning chase notice.',
      mode: 'chat' as const,
    },
    {
      label: 'Seat Discount Strategy',
      text: 'How should we price our Additional User Seats for a customer wanting to scale from 5 to 25 seats?',
      mode: 'chat' as const,
    },
    {
      label: 'Verify Austin Customer Location',
      text: 'Find business offices and commercial tech hubs near 742 Evergreen Terrace, Austin, TX 78701 for Apex Retail.',
      mode: 'maps' as const,
    },
    {
      label: 'Odoo Variant Economics',
      text: 'Explain the margin implications of adding the Odoo Brand variant (+560 surcharge) vs standard edition.',
      mode: 'chat' as const,
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      if (mode === 'maps') {
        // Call Google Maps Grounding endpoint
        const res = await fetch('/api/gemini/maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const aiResponse: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          text: data.text || 'Location query completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: data.sources || [],
          isMapsGrounded: true,
        };

        setMessages((prev) => [...prev, aiResponse]);
      } else {
        // Multi-turn conversation call
        const historyForApi = messages
          .concat(userMessage)
          .map((m) => ({ role: m.role, text: m.text }));

        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyForApi,
            model: selectedModel,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const aiResponse: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          text: data.text || 'Understood.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiResponse]);
      }
    } catch (err: any) {
      const errorResponse: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        text: `Error connecting to Gemini service: ${err.message || 'Check connection'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <span>Brightloop AI Copilot</span>
              <span className="text-[10px] font-mono font-normal bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-800">
                {selectedModel}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Gemini 3.8 Flash with Google Maps Grounding</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector & Model Picker Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
        {/* Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-lg">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
              mode === 'chat'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Assistant</span>
          </button>
          <button
            onClick={() => setMode('maps')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
              mode === 'maps'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Maps Grounding</span>
          </button>
        </div>

        {/* Model Selector */}
        {mode === 'chat' && (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-[11px] font-mono bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
          </select>
        )}
      </div>

      {/* Chat Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 text-xs ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                {msg.isMapsGrounded ? (
                  <MapPin className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs space-y-2 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

              {/* Google Maps Grounding Sources & Direct Links */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Google Maps Places:</span>
                  </div>
                  <div className="space-y-1">
                    {msg.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center justify-between p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-950 transition-colors group"
                      >
                        <span className="font-semibold truncate max-w-[280px]">
                          {src.title || src.address || 'View on Google Maps'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`text-[10px] text-right font-mono ${
                  msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 text-xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-500 font-mono ml-1">
                {mode === 'maps'
                  ? 'Retrieving Google Maps grounding data...'
                  : 'Synthesizing subscription advice...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="p-2.5 bg-slate-100/70 border-t border-slate-200 overflow-x-auto flex gap-2 shrink-0">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => {
              setMode(qp.mode);
              handleSendMessage(qp.text);
            }}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-[11px] font-medium text-slate-700 whitespace-nowrap shadow-2xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            {qp.mode === 'maps' ? (
              <MapPin className="w-3 h-3 text-emerald-600" />
            ) : (
              <Sparkles className="w-3 h-3 text-indigo-600" />
            )}
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            mode === 'maps'
              ? 'Ask for places, branch verification, tech hubs...'
              : 'Ask Copilot about plans, MRR, discount rules...'
          }
          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
