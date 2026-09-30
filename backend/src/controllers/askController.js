const { generateEmbedding } = require("../services/embeddingService");
const { searchChunks } = require("../services/chromaService");
const { generateAnswer } = require("../services/llmService");
const parseGithubUrl = require("../utils/githubUrlParser");

/**
 * Controller for asking questions about the indexed repository using RAG.
 * Accepts: { "question": "...", "repository"?: "owner/repo", "url"?: "..." }
 */
async function askQuestion(req, res, next) {
    try {
        const { question, repository, url } = req.body;

        if (!question || typeof question !== "string" || question.trim().length === 0) {
            return res.status(400).json({
                error: "Please provide a valid 'question' string"
            });
        }

        let repoFilter = repository || null;
        if (url && !repoFilter) {
            try {
                const parsed = parseGithubUrl(url);
                repoFilter = `${parsed.owner}/${parsed.repo}`;
            } catch {
                // If url parsing fails, proceed without filter
            }
        }

        // 1. Generate question embedding
        const questionEmbedding = await generateEmbedding(question.trim());

        // 2. Retrieve top-k relevant chunks from ChromaDB
        const retrievedChunks = await searchChunks(questionEmbedding, 4, repoFilter);

        if (!retrievedChunks || retrievedChunks.length === 0) {
            return res.status(200).json({
                answer: "Could not find any relevant information in the indexed repository. Please ensure the repository is indexed first.",
                sources: []
            });
        }

        // 3. Construct structured context from retrieved chunks
        const context = retrievedChunks
            .map(chunk => `[File: ${chunk.path} | Chunk: ${chunk.chunkIndex}]\n${chunk.content}`)
            .join("\n\n---\n\n");

        // 4. Generate answer using local Ollama LLM
        const answer = await generateAnswer(question.trim(), context);

        // 5. Extract genuine sources from metadata
        const sources = retrievedChunks.map(c => ({
            path: c.path,
            chunkIndex: c.chunkIndex,
            repository: c.repository
        }));

        return res.status(200).json({
            answer,
            sources
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    askQuestion
};
