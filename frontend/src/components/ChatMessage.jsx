import React from 'react';
import ReactMarkdown from 'react-markdown';
import SourceList from './SourceList';

export default function ChatMessage({ item }) {
  const { question, answer, sources, error, timestamp } = item;

  return (
    <div className="card chat-message-card">
      <div className="question-bubble">
        <span className="bubble-label">Question:</span>
        <p className="question-text">{question}</p>
        {timestamp && <span className="message-time">{timestamp}</span>}
      </div>

      <div className="answer-bubble">
        <span className="bubble-label">Answer:</span>

        {error ? (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <div className="answer-content">
            <div className="answer-text">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>

            {sources && sources.length > 0 && (
              <SourceList sources={sources} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}