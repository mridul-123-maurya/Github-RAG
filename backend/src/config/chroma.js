const { ChromaClient } = require("chromadb");
const { CHROMA_HOST, CHROMA_PORT } = require("./env");

const chroma = new ChromaClient({
    host: CHROMA_HOST || "localhost",
    port: Number(CHROMA_PORT) || 8000
});

module.exports = chroma;
