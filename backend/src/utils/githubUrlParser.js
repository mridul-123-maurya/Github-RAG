/**
 * Parses GitHub URLs or repository identifiers into { owner, repo }.
 *
 * Supported formats:
 * - https://github.com/owner/repository
 * - https://github.com/owner/repository.git
 * - http://github.com/owner/repository
 * - github.com/owner/repository
 * - owner/repository
 *
 * @param {string} input - GitHub URL or repository identifier.
 * @returns {{ owner: string, repo: string }} Extracted owner and repository names.
 * @throws {Error} If input is invalid or cannot be parsed.
 */
function parseGithubUrl(input) {
    if (!input || typeof input !== "string") {
        throw new Error("Invalid input: GitHub repository URL must be a non-empty string");
    }

    // Trim whitespace and remove trailing slashes or .git suffix
    const cleaned = input.trim().replace(/\.git$/i, "").replace(/\/+$/, "");

    // Regex matching owner/repo at the end of a github URL or standalone owner/repo
    const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)$|^([^/\s]+)\/([^/\s]+)$/;
    const match = cleaned.match(regex);

    if (!match) {
        throw new Error(`Invalid GitHub repository URL: "${input}". Expected format: https://github.com/owner/repo or owner/repo`);
    }

    const owner = match[1] || match[3];
    const repo = match[2] || match[4];

    if (!owner || !repo) {
        throw new Error(`Could not extract repository owner and name from "${input}"`);
    }

    return { owner, repo };
}

module.exports = parseGithubUrl;
