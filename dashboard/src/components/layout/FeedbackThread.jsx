import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAppContext } from '../../context/AppContext';
import { GlassCard } from '../layout/GlassCard';

export function FeedbackThread({ targetEmail, targetName }) {
  const { selectedProject, authUser } = useAppContext();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchComments() {
      if (!selectedProject?.project_id) return;
      const data = await api.getProjectComments(selectedProject.project_id);
      if (active) {
        const relevant = data.filter(c =>
          c.target_email === targetEmail || c.author_email === targetEmail
        );
        relevant.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setComments(relevant);
      }
    }
    fetchComments();
    const interval = setInterval(fetchComments, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedProject?.project_id, targetEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedProject?.project_id) return;

    setIsSubmitting(true);
    try {
      const added = await api.createProjectComment(
        selectedProject.project_id,
        targetEmail,
        newComment
      );
      setComments(prev => [...prev, added]);
      setNewComment('');
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authUser) return null;

  return (
    <GlassCard className="feedback-thread" title={`Feedback — ${targetName}`}>
      <div className="feedback-messages">
        {comments.length === 0 ? (
          <div className="feedback-empty">No feedback yet. Start the conversation!</div>
        ) : (
          comments.map(c => {
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

      <form onSubmit={handleSubmit} className="feedback-form">
        <input
          type="text"
          className="input"
          placeholder={`Message ${targetName}...`}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!newComment.trim() || isSubmitting}>
          {isSubmitting ? '...' : 'Send'}
        </button>
      </form>
    </GlassCard>
  );
}
