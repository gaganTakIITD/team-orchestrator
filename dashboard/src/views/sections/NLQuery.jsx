import React, { useState } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Button } from '../../components/ui/components';
import { api } from '../../api/client';

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export function NLQuery() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setResponse('');

    const result = await api.askQuestion(query);
    if (result && result.answer) {
      setResponse(result.answer);
    } else {
      setResponse('Could not reach API. Make sure the backend and LLM are running.');
    }
    setIsLoading(false);
  };

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Ask AI
      </h3>

      <GlassCard className="chart-card-inner">
        <form onSubmit={handleAsk} className="query-form">
          <input
            type="text"
            className="input"
            placeholder="E.g., Who contributed the most bug fixes? What area needs more tests?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <><div className="spinner spinner-sm" /> Thinking</>
            ) : (
              <><IconSearch /> Ask AI</>
            )}
          </Button>
        </form>

        {response && (
          <div className="query-response slide-up">
            <div className="query-response-header">
              <div className="query-response-avatar"><IconBolt /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="section-subheader">AI Response</div>
                <p style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 'var(--text-sm)', wordBreak: 'break-word' }}>{response}</p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </section>
  );
}
