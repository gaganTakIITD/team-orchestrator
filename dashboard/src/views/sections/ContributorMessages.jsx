import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppContext } from '../../context/AppContext';
import { GlassCard } from '../../components/layout/GlassCard';

export function ContributorMessages({ vectors }) {
  const { selectedProject, authUser } = useAppContext();
  const [professorComments, setProfessorComments] = useState([]);
  const [peers, setPeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [peerComments, setPeerComments] = useState([]);
  const [professorInput, setProfessorInput] = useState('');
  const [peerInput, setPeerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRepoOwner = selectedProject?.owner_login === authUser?.login;
  const professorEmail = isRepoOwner ? authUser?.email : (selectedProject?.registered_by?.email || '');
  const professorName = selectedProject?.registered_by?.name || 'Professor';
  const isProfessor = professorEmail === authUser?.email;
  const canMessageProfessor = selectedProject && professorEmail && !isProfessor;

  useEffect(() => {
    if (!vectors?.length) return;
    setPeers(vectors.filter(v => v.email !== authUser?.email));
  }, [vectors, authUser?.email]);

  useEffect(() => {
    let active = true;
    async function fetchProfessorChat() {
      if (!selectedProject?.project_id) return;
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
  }, [selectedProject?.project_id, professorEmail]);

  useEffect(() => {
    let active = true;
    async function fetchPeerChat() {
      if (!selectedProject?.project_id || !selectedPeer?.email) return;
      const data = await api.getProjectComments(selectedProject.project_id);
      if (active) {
        const relevant = data.filter(c =>
          c.target_email === selectedPeer.email || c.author_email === selectedPeer.email
        );
        relevant.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setPeerComments(relevant);
      }
    }
    fetchPeerChat();
    const interval = setInterval(fetchPeerChat, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedProject?.project_id, selectedPeer?.email]);

  const handleSendProfessor = async (e) => {
    e.preventDefault();
    const target = isProfessor ? (professorReplyTo || professorThreadAuthors[0]?.email) : professorEmail;
    if (!professorInput.trim() || !selectedProject?.project_id || !target) return;
    const content = professorInput;
    setProfessorInput('');
    setIsSubmitting(true);
    try {
      const added = await api.createProjectComment(selectedProject.project_id, target, content);
      setProfessorComments(prev => [...prev, added]);
    } catch (err) {
      console.error('Failed to send', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPeer = async (e) => {
    e.preventDefault();
    if (!peerInput.trim() || !selectedProject?.project_id || !selectedPeer?.email) return;
    const content = peerInput;
    setPeerInput('');
    setIsSubmitting(true);
    try {
      const added = await api.createProjectComment(selectedProject.project_id, selectedPeer.email, content);
      setPeerComments(prev => [...prev, added]);
    } catch (err) {
      console.error('Failed to send', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const professorThreadAuthors = professorComments
    .filter(c => c.author_email && c.author_email !== professorEmail)
    .reduce((acc, c) => {
      if (!acc.find(x => x.email === c.author_email)) acc.push({ email: c.author_email, name: c.author_name });
      return acc;
    }, []);

  const [professorReplyTo, setProfessorReplyTo] = useState('');

  if (!authUser) return null;

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        Messages
      </h3>

      <div className="grid-2col">
        <GlassCard className="chart-card-inner">
          <div className="section-subheader" style={{ marginBottom: 16 }}>
            <span>👨‍🏫 Professor</span>
          </div>
          <div className="contributor-messages-thread">
            {professorComments.length === 0 ? (
              <div className="feedback-empty">
                {canMessageProfessor
                  ? 'No messages yet. Ask your professor a question!'
                  : isProfessor
                    ? 'Students can message you here.'
                    : 'Select a project to message the professor.'}
              </div>
            ) : (
              professorComments.map(c => {
                const isMe = c.author_email === authUser.email;
                return (
                  <div key={c.id} className={`feedback-bubble ${isMe ? 'self' : 'other'}`}>
                    <div className="feedback-bubble-meta">
                      <span style={{ fontWeight: 600 }}>{isMe ? 'You' : c.author_name}</span>
                      <span>{new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="feedback-bubble-content">{c.content}</div>
                  </div>
                );
              })
            )}
          </div>
          {(canMessageProfessor || isProfessor) && (
            <form onSubmit={handleSendProfessor} className="feedback-form" style={{ marginTop: 12 }}>
              {isProfessor && professorThreadAuthors.length > 0 && (
                <select
                  className="input"
                  value={professorReplyTo}
                  onChange={e => setProfessorReplyTo(e.target.value)}
                  style={{ marginBottom: 8 }}
                >
                  <option value="">Reply to...</option>
                  {professorThreadAuthors.map(a => (
                    <option key={a.email} value={a.email}>{a.name || a.email}</option>
                  ))}
                </select>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  placeholder={
                    isProfessor
                      ? professorThreadAuthors.length > 0
                        ? "Reply to student..."
                        : "Wait for students to message..."
                      : "Message professor..."
                  }
                  value={professorInput}
                  onChange={e => setProfessorInput(e.target.value)}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={
                    !professorInput.trim() ||
                    isSubmitting ||
                    (isProfessor && professorThreadAuthors.length === 0)
                  }
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </GlassCard>

        <GlassCard className="chart-card-inner">
          <div className="section-subheader" style={{ marginBottom: 12 }}>👥 Peers</div>
          {!selectedPeer ? (
            <>
              <p className="contributor-messages-hint">Select a peer to chat with:</p>
              <div className="contributor-messages-peer-list">
                {peers.map(p => (
                  <button
                    key={p.email}
                    className="contributor-peer-btn"
                    onClick={() => setSelectedPeer(p)}
                  >
                    {p.name || p.email}
                  </button>
                ))}
                {peers.length === 0 && (
                  <div className="feedback-empty">No team members yet.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="contributor-back-btn" onClick={() => setSelectedPeer(null)}>← Back to peers</button>
              <div className="contributor-messages-thread">
                {peerComments.length === 0 ? (
                  <div className="feedback-empty">No messages yet. Start the conversation!</div>
                ) : (
                  peerComments.map(c => {
                    const isMe = c.author_email === authUser.email;
                    return (
                      <div key={c.id} className={`feedback-bubble ${isMe ? 'self' : 'other'}`}>
                        <div className="feedback-bubble-meta">
                          <span style={{ fontWeight: 600 }}>{isMe ? 'You' : c.author_name}</span>
                          <span>{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="feedback-bubble-content">{c.content}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={handleSendPeer} className="feedback-form" style={{ marginTop: 12 }}>
                <input
                  type="text"
                  className="input"
                  placeholder={`Message ${selectedPeer.name}...`}
                  value={peerInput}
                  onChange={e => setPeerInput(e.target.value)}
                  disabled={isSubmitting}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!peerInput.trim() || isSubmitting}>
                  Send
                </button>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
