import React, { useState } from 'react';

export default function ChatInput({ onAsk, isLoading, disabled, placeholder }) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading || disabled) return;
    onAsk(question.trim());
    setQuestion('');
  };

  return (
    <section className="card chat-input-section">
      <h2 className="section-title">Ask about your repository</h2>
      <form onSubmit={handleSubmit} className="chat-form">
        <div className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder={
              placeholder ||
              (disabled
                ? 'Please index a repository first to ask questions...'
                : 'Where is authentication implemented?')
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={disabled || isLoading}
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={disabled || isLoading || !question.trim()}
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>
    </section>
  );
}
