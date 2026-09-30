import React from 'react';

export default function SourceList({ sources = [] }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  // Deduplicate sources by file path
  const uniquePaths = [...new Set(sources.map((s) => s.path))];

  return (
    <div className="source-list-card">
      <div className="source-list-header">
        <svg
          className="source-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>Sources ({uniquePaths.length} files referenced)</span>
      </div>
      <ul className="source-list">
        {uniquePaths.map((path, idx) => (
          <li key={idx} className="source-item">
            <span className="source-bullet">•</span>
            <code className="source-path">{path}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
