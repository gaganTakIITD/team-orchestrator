import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppContext } from '../../context/AppContext';

export function GlobalChat() {
  const { authUser, selectedProject } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi there! Im your AI Assistant. Ask me anything about your analyzed repositories!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!authUser) return null; // Only show if logged in

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      // For now, if Ollama is down, this will throw a 503 from backend.
      // We catch it and show a graceful fallback message.
      const res = await api.client.post('/query', { question: userText });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (err) {
      console.error(err);
      const is503 = err.response?.status === 503;
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: is503 
          ? "I'm offline! The local Ollama LLM is currently unreachable so I cannot search the repository index. Please make sure `ollama serve` is running!" 
          : "Sorry, I ran into an error trying to process that."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-accent)',
          color: 'var(--color-text-primary)',
          boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          width: '360px',
          height: '480px',
          background: 'var(--color-glass)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9998,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%' }}></div>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>AI Repo Assistant</span>
            {selectedProject && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{selectedProject.name}</span>}
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, padding: 'var(--space-4)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: m.role === 'user' ? 'var(--color-primary-dark)' : 'var(--color-surface)',
                border: m.role === 'user' ? 'none' : '1px solid var(--color-border)',
                borderBottomRightRadius: m.role === 'user' ? '2px' : 'var(--radius-md)',
                borderBottomLeftRadius: m.role === 'ai' ? '2px' : 'var(--radius-md)',
              }}>
                <div style={{ fontSize: '10px', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', marginBottom: '4px' }}>
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5', color: m.role === 'user' ? '#fff' : 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', padding: 'var(--space-2) var(--space-4)', background: 'var(--color-surface)', borderRadius: '20px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                typing...
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Ask a question..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ flex: 1, fontSize: '13px' }}
              disabled={isTyping}
            />
            <button type="submit" className="btn btn-primary" disabled={isTyping || !input.trim()} style={{ padding: '0 16px', minHeight: '38px', borderRadius: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
