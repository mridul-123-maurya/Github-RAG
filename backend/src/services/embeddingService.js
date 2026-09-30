const { Ollama } = require("ollama");
const { OLLAMA_HOST, OLLAMA_EMBED_MODEL, EMBED_BATCH_SIZE } = require("../config/env");

const ollama = new Ollama({
    host: OLLAMA_HOST
});

/**
 * Generates vector embedding for the given text using local Ollama model.
 *
 * @param {string} text - Text to embed.
 * @returns {Promise<number[]>} Vector embedding array.
 */
async function generateEmbedding(text) {
    if (!text || typeof text !== "string") {
        throw new Error("Text must be a non-empty string to generate embedding");
    }

    try {
        const response = await ollama.embed({
            model: OLLAMA_EMBED_MODEL || "nomic-embed-text",
            input: text
        });

        if (!response || !response.embeddings || !response.embeddings[0]) {
            throw new Error("Invalid response received from Ollama embedding model");
        }

        return response.embeddings[0];
    } catch (error) {
        if (error.code === "ECONNREFUSED" || (error.message && error.message.includes("ECONNREFUSED"))) {
            throw new Error(`Cannot connect to Ollama at ${OLLAMA_HOST}. Please make sure Ollama is running.`);
        }
        throw error;
    }
}

/**
 * Generates vector embeddings for a batch of texts using local Ollama model.
 * Leverages vector parallelism in Ollama to drastically reduce HTTP overhead and latency.
 *
 * @param {string[]} texts - Array of chunk strings to embed.
 * @param {number} [batchSize] - Size of each batch.
 * @returns {Promise<number[][]>} Array of vector embeddings.
 */
async function generateBatchEmbeddings(texts, batchSize = EMBED_BATCH_SIZE || 25) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return [];
    }

    const embeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        try {
            const response = await ollama.embed({
                model: OLLAMA_EMBED_MODEL || "nomic-embed-text",
                input: batch
            });

            if (!response || !response.embeddings || response.embeddings.length !== batch.length) {
                throw new Error("Invalid response received from Ollama embedding model");
            }

            embeddings.push(...response.embeddings);
        } catch (error) {
            if (error.code === "ECONNREFUSED" || (error.message && error.message.includes("ECONNREFUSED"))) {
                throw new Error(`Cannot connect to Ollama at ${OLLAMA_HOST}. Please make sure Ollama is running.`);
            }

            // Fallback for this batch if batch embedding ever errors
            console.warn(`[Embedding] Batch embedding of size ${batch.length} failed (${error.message}). Falling back to sequential for this batch.`);
            for (const text of batch) {
                const single = await generateEmbedding(text);
                embeddings.push(single);
            }
        }
    }

    return embeddings;
}

module.exports = {
    ollama,
    generateEmbedding,
    generateBatchEmbeddings
};

