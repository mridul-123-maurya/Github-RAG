const dotenv = require("dotenv");
const path = require("path");

// Load .env from backend root directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
    PORT: process.env.PORT || 5000,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    CHROMA_HOST: process.env.CHROMA_HOST || "localhost",
    CHROMA_PORT: process.env.CHROMA_PORT || "8000",
    OLLAMA_HOST: process.env.OLLAMA_HOST || "http://localhost:11434",
    OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
    OLLAMA_LLM_MODEL: process.env.OLLAMA_LLM_MODEL || "llama3.2:1b",
    MAX_FILES_TO_INDEX: parseInt(process.env.MAX_FILES_TO_INDEX, 10) || 150,
    FETCH_CONCURRENCY: parseInt(process.env.FETCH_CONCURRENCY, 10) || 12,
    EMBED_BATCH_SIZE: parseInt(process.env.EMBED_BATCH_SIZE, 10) || 25,
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 100000
};
