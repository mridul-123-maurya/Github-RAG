const { generateEmbedding } = require("../services/embeddingService");
const { searchChunks } = require("../services/chromaService");
const parseGithubUrl = require("../utils/githubUrlParser");

/**
 * Controller for performing semantic similarity search on stored repository chunks.
 * Accepts: { "question": "...", "repository"?: "owner/repo", "nResults"?: 3 }
 */
async function searchRepository(req, res, next) {
    try {
        const { question, repository, url, nResults = 3 } = req.body;

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
                // If url parsing fails, ignore filter and search globally
            }
        }

        // 1. Generate query embedding using local Ollama nomic-embed-text
        const queryEmbedding = await generateEmbedding(question.trim());

        // 2. Query ChromaDB for top-k similar chunks
        const results = await searchChunks(queryEmbedding, nResults, repoFilter);

        return res.status(200).json({
            results
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    searchRepository
};
