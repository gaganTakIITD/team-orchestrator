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
        // Filter comments for this specific user interaction
        // Comments where they are the target, OR they are the author
        const relevant = data.filter(c => 
          c.target_email === targetEmail || 
          c.author_email === targetEmail
        );
        // Sort chronologically
        relevant.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setComments(relevant);
      }
    }
    fetchComments();
    const interval = setInterval(fetchComments, 10000); // poll every 10s
    return () => { active = false; clearInterval(interval); };
  }, [selectedProject?.project_id, targetEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedProject?.project_id) return;

    setIsSubmitting(true);
    try {
      const added = await api.createProjectComment(
        selectedProject.project_id,
        targetEmail, // always target the currently selected student
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
    <GlassCard title={`Feedback Loop with ${targetName}`}>
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '400px', overflowY: 'auto' }}>
        
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6) 0', fontStyle: 'italic', fontSize: '13px' }}>
            No feedback yet. Start the conversation!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {comments.map(c => {
              const isMe = c.author_email === authUser.email;
              return (
                <div key={c.id} style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: isMe ? 'var(--color-primary-dark)' : 'var(--color-surface)',
                  border: isMe ? 'none' : '1px solid var(--color-border)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  borderBottomRightRadius: isMe ? '2px' : 'var(--radius-md)',
                  borderBottomLeftRadius: isMe ? 'var(--radius-md)' : '2px',
                }}>
                  <div style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{isMe ? 'You' : c.author_name}</span>
                    <span>{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.5', color: isMe ? '#fff' : 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                    {c.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)', background: 'var(--color-surface-hover)' }}>
        <input
          type="text"
          className="input"
          placeholder={`Type a message to ${targetName}...`}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ flex: 1, background: 'var(--color-surface)' }}
          disabled={isSubmitting}
        />
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={!newComment.trim() || isSubmitting}
          style={{ padding: '0 var(--space-4)' }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </GlassCard>
  );
}
