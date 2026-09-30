/**
 * Splits text into overlapping chunks using sliding window.
 *
 * @param {string} text - The input text content to chunk.
 * @param {number} chunkSize - Maximum size of each chunk in characters (default: 1000).
 * @param {number} overlap - Number of overlapping characters between chunks (default: 200).
 * @returns {string[]} Array of text chunks.
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
    if (!text || typeof text !== "string") {
        return [];
    }

    if (chunkSize <= 0) {
        throw new Error("chunkSize must be greater than 0");
    }

    if (overlap < 0 || overlap >= chunkSize) {
        throw new Error("overlap must be non-negative and less than chunkSize");
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        const chunk = text.slice(start, end).trim();
        // Skip empty or trivial snippets to save embedding & storage overhead
        if (chunk.length >= 20) {
            chunks.push(chunk);
        }
        start += chunkSize - overlap;
    }

    return chunks;
}

module.exports = chunkText;
