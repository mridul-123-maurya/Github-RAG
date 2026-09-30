import React, { useState } from 'react';
import RepositoryInput from '../components/RepositoryInput';
import ChatInput from '../components/ChatInput';
import ChatMessage from '../components/ChatMessage';
import Loading from '../components/Loading';
import { indexRepository, askQuestion } from '../services/api';

export default function Home() {
  const [indexedRepo, setIndexedRepo] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState(null);

  const [conversation, setConversation] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  // Handle repository indexing
  const handleIndex = async (url) => {
    setIsIndexing(true);
    setIndexStatus({
      type: 'info',
      message: `Fetching and indexing repository from ${url}... This might take a moment.`
    });

    try {
      const data = await indexRepository(url);
      setIndexedRepo(data.repository);
      setIndexStatus({
        type: 'success',
        message: data.durationSeconds
          ? `${data.message} in ${data.durationSeconds}s!`
          : data.message,
        data: {
          repository: data.repository,
          filesProcessed: data.filesProcessed,
          chunksStored: data.chunksStored,
          durationSeconds: data.durationSeconds
        }
      });
    } catch (err) {
      setIndexStatus({
        type: 'error',
        message: err.message || 'Failed to index repository'
      });
    } finally {
      setIsIndexing(false);
    }
  };

  // Handle asking questions
  const handleAsk = async (question) => {
    setIsAsking(true);
    const newEntry = {
      id: Date.now(),
      question,
      answer: null,
      sources: [],
      error: null,
      timestamp: new Date().toLocaleTimeString()
    };

    // Prepend or append to conversation
    setConversation((prev) => [newEntry, ...prev]);

    try {
      const data = await askQuestion(question, indexedRepo);
      setConversation((prev) =>
        prev.map((item) =>
          item.id === newEntry.id
            ? { ...item, answer: data.answer, sources: data.sources || [] }
            : item
        )
      );
    } catch (err) {
      setConversation((prev) =>
        prev.map((item) =>
          item.id === newEntry.id
            ? { ...item, error: err.message || 'Failed to get an answer from the assistant' }
            : item
        )
      );
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">GitHub RAG Assistant</h1>
        <p className="app-subtitle">
          Index any public GitHub repository into ChromaDB and ask questions powered by local Ollama AI
        </p>
      </header>

      <main className="app-main">
        {/* Step 1: Repository Input */}
        <RepositoryInput
          onIndex={handleIndex}
          isIndexing={isIndexing}
          indexStatus={indexStatus}
        />

        {isIndexing && <Loading message="Fetching files in parallel, chunking, and batch-generating embeddings..." />}

        {/* Step 2: Chat Input */}
        <ChatInput
          onAsk={handleAsk}
          isLoading={isAsking}
          disabled={isIndexing}
          placeholder={
            indexedRepo
              ? `Ask anything about ${indexedRepo} (e.g. Where is authentication implemented?)`
              : 'Enter a repository above and click Index first...'
          }
        />

        {isAsking && <Loading message="Searching ChromaDB chunks and consulting local Ollama LLM..." />}

        {/* Step 3: Q&A History & Answers */}
        <section className="conversation-section">
          {conversation.map((item) => (
            <ChatMessage key={item.id} item={item} />
          ))}
        </section>
      </main>
    </div>
  );
}
