import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppContext } from '../../context/AppContext';

const CHANNELS = {
  ai: { id: 'ai', label: 'AI Assistant', icon: '🤖' },
  professor: { id: 'professor', label: 'Professor', icon: '👨‍🏫' },
  peers: { id: 'peers', label: 'Peers', icon: '👥' },
};

export function ChatHub() {
  const { authUser, selectedProject } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState('ai');
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Assistant. Ask me anything about your analyzed repositories!" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [professorComments, setProfessorComments] = useState([]);
  const scrollRef = useRef(null);

  const professorEmail = selectedProject?.registered_by?.email;
  const professorName = selectedProject?.registered_by?.name || 'Professor';
  const isProfessor = professorEmail === authUser?.email;
  const [professorReplyTo, setProfessorReplyTo] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    let active = true;
    async function fetchProfessorChat() {
      if (!selectedProject?.project_id || channel !== 'professor') return;
      const data = await api.getProjectComments(selectedProject.project_id);
      if (active) {
        const profThread = data.filter(c =>
          c.target_email === professorEmail || c.author_email === professorEmail
        );
        profThread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setProfessorComments(profThread);
      }
    }
    fetchProfessorChat();
    const interval = setInterval(fetchProfessorChat, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedProject?.project_id, channel, professorEmail]);

  const handleSendAI = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.client.post('/query', { question: userText });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (err) {
      const is503 = err.response?.status === 503;
      setMessages(prev => [...prev, {
        role: 'ai',
        text: is503
          ? "I'm offline! Make sure `ollama serve` is running."
          : "Sorry, I ran into an error."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendProfessor = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedProject?.project_id) return;

    const content = input;
    setInput('');
    const targetEmail = isProfessor ? (professorReplyTo || professorComments[0]?.author_email) : professorEmail;
    if (!targetEmail) return;

    try {
      const added = await api.createProjectComment(
        selectedProject.project_id,
        targetEmail,
        content
      );
      setProfessorComments(prev => [...prev, added]);
    } catch (err) {
      console.error('Failed to send', err);
    }
  };

  const professorThreadAuthors = professorComments
    .filter(c => c.author_email && c.author_email !== professorEmail)
    .reduce((acc, c) => {
      if (!acc.find(x => x.email === c.author_email)) acc.push({ email: c.author_email, name: c.author_name });
      return acc;
    }, []);

  const handleSend = (e) => {
    if (channel === 'ai') handleSendAI(e);
    else if (channel === 'professor') handleSendProfessor(e);
  };

  const canSendProfessor = selectedProject && professorEmail && !isProfessor;

  if (!authUser) return null;

  return (
    <>
      <button className="chat-fab" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Close chat' : 'Open chat'}>
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="chat-panel chat-panel-wide">
          <div className="chat-header">
            <div className="chat-channel-tabs">
              {Object.values(CHANNELS).map(ch => (
                <button
                  key={ch.id}
                  className={`chat-channel-tab ${channel === ch.id ? 'active' : ''}`}
                  onClick={() => setChannel(ch.id)}
                  title={ch.label}
                >
                  <span className="chat-channel-icon">{ch.icon}</span>
                  <span className="chat-channel-label">{ch.label}</span>
                </button>
              ))}
            </div>
            {selectedProject && <span className="chat-header-project">{selectedProject.name}</span>}
          </div>

          {channel === 'peers' ? (
            <div className="chat-peers-view">
              <div className="chat-peers-header">
                <span>Select a peer to chat with from the Feedback Coach tab.</span>
              </div>
              <div className="chat-peers-hint">
                <p>💡 Go to <strong>My Coaching</strong> or <strong>Feedback Coach</strong> to message individual team members.</p>
              </div>
            </div>
          ) : channel === 'professor' ? (
            <div className="chat-messages-wrap">
              <div ref={scrollRef} className="chat-messages">
                {professorComments.length === 0 ? (
                  <div className="chat-empty">
                    {canSendProfessor
                      ? 'No messages yet. Ask your professor a question!'
                      : isProfessor
                        ? 'Students can message you here. Their messages will appear above.'
                        : 'Select a project to message the professor.'}
                  </div>
                ) : (
                  professorComments.map(c => {
                    const isMe = c.author_email === authUser.email;
                    return (
                      <div key={c.id} className={`chat-bubble ${isMe ? 'user' : 'ai'}`}>
                        <div className="chat-bubble-label">{isMe ? 'You' : c.author_name}</div>
                        <div className="chat-bubble-text">{c.content}</div>
                        <div className="chat-bubble-time">{new Date(c.timestamp).toLocaleString()}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={handleSendProfessor} className="chat-input-form chat-input-form-stacked">
                {isProfessor && professorThreadAuthors.length > 0 && (
                  <div className="chat-reply-to-row">
                    <select
                      className="chat-reply-to-select"
                      value={professorReplyTo}
                      onChange={e => setProfessorReplyTo(e.target.value)}
                    >
                      <option value="">Reply to...</option>
                      {professorThreadAuthors.map(a => (
                        <option key={a.email} value={a.email}>{a.name || a.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="chat-input-row">
                <input
                  type="text"
                  className="input"
                  placeholder={canSendProfessor ? "Message professor..." : (isProfessor ? "Reply to student..." : "Select a project first")}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={!canSendProfessor && !isProfessor}
                />
                <button type="submit" className="chat-send-btn" disabled={!input.trim() || (!canSendProfessor && !isProfessor)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
                    <div className="chat-bubble-label">{m.role === 'user' ? 'You' : 'Assistant'}</div>
                    <div className="chat-bubble-text">{m.text}</div>
                  </div>
                ))}
                {isTyping && <div className="chat-typing">typing...</div>}
              </div>
              <form onSubmit={handleSend} className="chat-input-form">
                <input
                  type="text"
                  className="input"
                  placeholder="Ask a question..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isTyping}
                />
                <button type="submit" className="chat-send-btn" disabled={isTyping || !input.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
