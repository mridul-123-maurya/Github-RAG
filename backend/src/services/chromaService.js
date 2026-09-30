const chroma = require("../config/chroma");
const { CHROMA_HOST, CHROMA_PORT } = require("../config/env");

const COLLECTION_NAME = "github-repository";

/**
 * Generates a stable, deterministic chunk ID.
 * Example: "owner__repo::src/auth/login.js::0"
 */
function createChunkId(repository, filePath, chunkIndex) {
    const cleanRepo = repository.replace(/\//g, "__");
    return `${cleanRepo}::${filePath}::${chunkIndex}`;
}

let cachedCollection = null;

/**
 * Gets or creates the ChromaDB collection for repository chunks.
 * Explicitly sets embeddingFunction to null since we supply Ollama embeddings manually.
 */
async function getCollection() {
    if (cachedCollection) {
        return cachedCollection;
    }
    try {
        const collection = await chroma.getOrCreateCollection({
            name: COLLECTION_NAME,
            // Explicitly provide a manual no-op function so Chroma never auto-generates embeddings
            embeddingFunction: {
                generate: async () => []
            }
        });
        cachedCollection = collection;
        return collection;
    } catch (error) {
        cachedCollection = null;
        if (
            error.code === "ECONNREFUSED" ||
            (error.message && error.message.includes("ECONNREFUSED")) ||
            (error.message && error.message.includes("fetch failed"))
        ) {
            throw new Error(`Cannot connect to ChromaDB at http://${CHROMA_HOST}:${CHROMA_PORT}. Please ensure ChromaDB is running.`);
        }
        throw error;
    }
}

/**
 * Upserts an array of chunks into ChromaDB.
 *
 * @param {Array<{
 *   id?: string,
 *   repository: string,
 *   path: string,
 *   chunkIndex: number,
 *   document: string,
 *   embedding: number[]
 * }>} chunks
 * @returns {Promise<number>} Number of chunks upserted.
 */
async function upsertChunks(chunks) {
    if (!chunks || chunks.length === 0) {
        return 0;
    }

    const collection = await getCollection();

    // Process in batches of 100 for fast bulk inserts
    const BATCH_SIZE = 100;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        const ids = batch.map(c => c.id || createChunkId(c.repository, c.path, c.chunkIndex));
        const documents = batch.map(c => c.document);
        const embeddings = batch.map(c => c.embedding);
        const metadatas = batch.map(c => ({
            repository: c.repository,
            path: c.path,
            chunkIndex: Number(c.chunkIndex)
        }));

        await collection.upsert({
            ids,
            documents,
            embeddings,
            metadatas
        });
    }

    return chunks.length;
}

/**
 * Searches the collection for chunks most similar to the query embedding.
 *
 * @param {number[]} queryEmbedding - Vector embedding of user question.
 * @param {number} nResults - Number of results to return (default: 3).
 * @param {string|null} repository - Optional repository filter (e.g. "owner/repo").
 * @returns {Promise<Array<{
 *   content: string,
 *   path: string,
 *   repository: string,
 *   chunkIndex: number,
 *   distance: number
 * }>>}
 */
async function searchChunks(queryEmbedding, nResults = 3, repository = null) {
    const collection = await getCollection();

    const queryParams = {
        queryEmbeddings: [queryEmbedding],
        nResults: Math.max(1, nResults)
    };

    if (repository) {
        queryParams.where = { repository };
    }

    const queryResponse = await collection.query(queryParams);

    // Normalize and format Chroma response into flat results array
    const results = [];

    if (
        queryResponse &&
        queryResponse.documents &&
        queryResponse.documents[0] &&
        queryResponse.documents[0].length > 0
    ) {
        const docs = queryResponse.documents[0];
        const metadatas = queryResponse.metadatas ? queryResponse.metadatas[0] : [];
        const distances = queryResponse.distances ? queryResponse.distances[0] : [];

        for (let i = 0; i < docs.length; i++) {
            const metadata = metadatas[i] || {};
            results.push({
                content: docs[i],
                path: metadata.path || "unknown",
                repository: metadata.repository || repository || "unknown",
                chunkIndex: metadata.chunkIndex !== undefined ? metadata.chunkIndex : i,
                distance: distances[i] !== undefined ? distances[i] : null
            });
        }
    }

    return results;
}

module.exports = {
    COLLECTION_NAME,
    createChunkId,
    getCollection,
    upsertChunks,
    searchChunks
};
