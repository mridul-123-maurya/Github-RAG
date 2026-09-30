const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper to handle fetch responses and parse errors cleanly.
 */
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { error: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data.error || `HTTP error! Status: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Triggers repository indexing on the backend.
 * @param {string} url - GitHub repository URL.
 * @returns {Promise<{ message: string, repository: string, filesProcessed: number, chunksStored: number }>}
 */
export async function indexRepository(url) {
  const response = await fetch(`${API_BASE_URL}/index`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });

  return handleResponse(response);
}

/**
 * Performs semantic similarity search on indexed chunks.
 * @param {string} question - Query text.
 * @param {string} [repository] - Optional repository identifier.
 * @returns {Promise<{ results: Array<{ content: string, path: string, chunkIndex: number, distance: number }> }>}
 */
export async function searchRepository(question, repository = null) {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question, repository })
  });

  return handleResponse(response);
}

/**
 * Retrieves context chunks and queries the local Ollama LLM to answer the question.
 * @param {string} question - Question to ask.
 * @param {string} [repository] - Optional repository identifier.
 * @returns {Promise<{ answer: string, sources: Array<{ path: string, chunkIndex: number, repository: string }> }>}
 */
export async function askQuestion(question, repository = null) {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question, repository })
  });

  return handleResponse(response);
}
