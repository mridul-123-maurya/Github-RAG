import React, { useState } from 'react';

export default function RepositoryInput({ onIndex, isIndexing, indexStatus }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim() || isIndexing) return;
    onIndex(url.trim());
  };

  return (
    <section className="card repo-section">
      <h2 className="section-title">GitHub Repository</h2>
      <form onSubmit={handleSubmit} className="repo-form">
        <div className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder="https://github.com/owner/repository"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isIndexing}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isIndexing || !url.trim()}
          >
            {isIndexing ? 'Indexing...' : 'Index Repository'}
          </button>
        </div>
      </form>

      {indexStatus && (
        <div
          className={`status-alert ${
            indexStatus.type === 'success'
              ? 'status-success'
              : indexStatus.type === 'error'
              ? 'status-error'
              : 'status-info'
          }`}
        >
          <div className="status-header">
            <strong>
              {indexStatus.type === 'success'
                ? 'Status: Repository indexed successfully'
                : indexStatus.type === 'error'
                ? 'Status: Indexing Failed'
                : 'Status: Processing'}
            </strong>
          </div>
          <div className="status-message">{indexStatus.message}</div>
          {indexStatus.data && (
            <div className="status-meta">
              <span>Repository: <code>{indexStatus.data.repository}</code></span>
              <span>Files Processed: <strong>{indexStatus.data.filesProcessed}</strong></span>
              <span>Chunks Stored: <strong>{indexStatus.data.chunksStored}</strong></span>
              {indexStatus.data.durationSeconds !== undefined && (
                <span>Time Taken: <strong>{indexStatus.data.durationSeconds}s</strong> ⚡</span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
