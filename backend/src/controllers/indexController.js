const parseGithubUrl = require("../utils/githubUrlParser");
const { getFiles, getFilesContentBatch } = require("../services/githubService");
const chunkText = require("../utils/chunkText");
const { generateBatchEmbeddings } = require("../services/embeddingService");
const { upsertChunks } = require("../services/chromaService");
const { FETCH_CONCURRENCY, EMBED_BATCH_SIZE } = require("../config/env");

/**
 * Controller for indexing a GitHub repository with parallelized fetching and vector batch embedding.
 * Accepts: { "url": "https://github.com/owner/repository" } or { "owner": "...", "repo": "..." }
 */
async function indexRepository(req, res, next) {
    const startTime = Date.now();
    try {
        const { url, owner: reqOwner, repo: reqRepo } = req.body;

        let owner;
        let repo;

        if (url) {
            const parsed = parseGithubUrl(url);
            owner = parsed.owner;
            repo = parsed.repo;
        } else if (reqOwner && reqRepo) {
            owner = reqOwner;
            repo = reqRepo;
        } else {
            return res.status(400).json({
                error: "Please provide a valid GitHub repository 'url' (e.g., https://github.com/owner/repository)"
            });
        }

        const repositoryId = `${owner}/${repo}`;
        console.log(`[Index] Starting high-performance indexing for ${repositoryId}...`);

        // 1. Fetch file tree and filter indexable files
        const treeStart = Date.now();
        const files = await getFiles(owner, repo);
        const branch = files.branch || "HEAD";

        if (!files || files.length === 0) {
            return res.status(400).json({
                error: `No indexable text files found in repository ${repositoryId}. It may be empty or contain only unsupported files.`
            });
        }

        console.log(`[Index] Selected ${files.length} prioritized candidate files in ${Date.now() - treeStart}ms.`);

        // 2. Concurrently fetch all file contents in parallel
        const fetchStart = Date.now();
        const fileContents = await getFilesContentBatch(owner, repo, files, branch, FETCH_CONCURRENCY);
        console.log(`[Index] Concurrently fetched ${fileContents.length} files in ${Date.now() - fetchStart}ms.`);

        if (fileContents.length === 0) {
            return res.status(400).json({
                error: `Could not retrieve readable contents for files in repository ${repositoryId}.`
            });
        }

        // 3. Chunk contents in-memory
        const allChunks = [];
        let filesProcessed = 0;

        for (const file of fileContents) {
            const rawChunks = chunkText(file.content, 1000, 200);

            for (let i = 0; i < rawChunks.length; i++) {
                allChunks.push({
                    repository: repositoryId,
                    path: file.path,
                    chunkIndex: i,
                    document: rawChunks[i]
                });
            }

            filesProcessed++;
        }

        if (allChunks.length === 0) {
            return res.status(400).json({
                error: `No valid chunks extracted from repository ${repositoryId}.`
            });
        }

        console.log(`[Index] Extracted ${allChunks.length} chunks from ${filesProcessed} files.`);

        // 4. Batch generate vector embeddings
        const embedStart = Date.now();
        const documents = allChunks.map(c => c.document);
        const embeddings = await generateBatchEmbeddings(documents, EMBED_BATCH_SIZE);

        for (let i = 0; i < allChunks.length; i++) {
            allChunks[i].embedding = embeddings[i];
        }
        console.log(`[Index] Generated embeddings for ${allChunks.length} chunks in ${Date.now() - embedStart}ms.`);

        // 5. Bulk upsert into ChromaDB
        const storeStart = Date.now();
        const storedCount = await upsertChunks(allChunks);
        console.log(`[Index] Stored ${storedCount} chunks into ChromaDB in ${Date.now() - storeStart}ms.`);

        const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
        console.log(`[Index] Successfully indexed ${repositoryId}: ${filesProcessed} files, ${storedCount} chunks in ${durationSeconds}s.`);

        return res.status(200).json({
            message: "Repository indexed successfully",
            repository: repositoryId,
            filesProcessed,
            chunksStored: storedCount,
            durationSeconds
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    indexRepository
};
