const { Octokit } = require("@octokit/rest");
const { GITHUB_TOKEN, MAX_FILES_TO_INDEX, FETCH_CONCURRENCY, MAX_FILE_SIZE } = require("../config/env");

const octokit = new Octokit({
    auth: GITHUB_TOKEN || undefined
});

const IGNORED_DIRECTORIES = [
    "node_modules/",
    ".git/",
    ".github/",
    ".vscode/",
    ".idea/",
    "dist/",
    "build/",
    "out/",
    ".next/",
    ".nuxt/",
    "coverage/",
    "vendor/",
    "__pycache__/",
    ".pytest_cache/",
    ".mypy_cache/",
    ".tox/",
    "venv/",
    ".venv/",
    "env/",
    ".env/",
    "target/",
    "bin/",
    "obj/",
    "tmp/",
    "temp/",
    "logs/",
    ".turbo/",
    ".cache/",
    "pods/",
    ".dart_tool/",
    "site-packages/",
    "cypress/",
    "playwright-report/"
];

const BINARY_OR_IRRELEVANT_EXTENSIONS = [
    // Media & images
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp", ".tiff", ".psd", ".ai",
    ".mp3", ".mp4", ".mov", ".avi", ".wav", ".webm", ".m4a", ".ogg",
    // Archives & docs
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz",
    // Binaries & Bytecode
    ".exe", ".dll", ".so", ".dylib", ".bin", ".class", ".pyc", ".pyd", ".pyo", ".wasm",
    // Fonts
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    // Bundles, minified & source maps
    ".min.js", ".min.css", ".map", ".bundle.js", ".chunk.js",
    // Large data / databases / locks
    ".lock", "-lock.json", ".lockb", "yarn.lock", "package-lock.json", "pnpm-lock.yaml",
    "cargo.lock", "gemfile.lock", "composer.lock", "poetry.lock",
    ".csv", ".tsv", ".parquet", ".sqlite", ".sqlite3", ".db", ".log"
];

/**
 * Assigns an architectural priority score to a file path.
 * Higher scores mean more fundamental code/docs to index first.
 */
function scoreFilePath(path) {
    const lower = path.toLowerCase();

    // Top priority: root documentation & project manifests
    if (lower === "readme.md" || lower.startsWith("readme")) return 100;
    if (lower === "package.json" || lower === "requirements.txt" || lower === "cargo.toml" || lower === "go.mod" || lower === "pom.xml") return 95;
    if (lower.startsWith("architecture") || lower.startsWith("contributing")) return 90;

    // High priority: core source directories
    if (lower.startsWith("src/") || lower.startsWith("lib/") || lower.startsWith("app/") || lower.startsWith("core/")) {
        if (lower.includes(".test.") || lower.includes(".spec.") || lower.includes("__tests__")) return 20;
        return 80;
    }

    // Key architectural folders
    if (
        lower.includes("/controllers/") || lower.includes("/services/") ||
        lower.includes("/routes/") || lower.includes("/models/") ||
        lower.includes("/components/") || lower.includes("/pages/") ||
        lower.includes("/api/")
    ) {
        return 75;
    }

    // Test folders have lower priority
    if (lower.startsWith("test/") || lower.startsWith("tests/") || lower.startsWith("spec/")) return 15;
    if (lower.includes("fixture") || lower.includes("mock") || lower.includes("sample")) return 10;

    // General source code files
    return 50;
}

/**
 * Checks if a file path belongs to ignored directories or binary extensions.
 */
function isUsefulFile(path, size) {
    const lower = path.toLowerCase();

    // Filter oversized files (default 100KB)
    if (size > (MAX_FILE_SIZE || 100000)) {
        return false;
    }

    // Filter ignored directories
    for (const dir of IGNORED_DIRECTORIES) {
        if (lower.startsWith(dir) || lower.includes("/" + dir) || lower.includes(dir)) {
            return false;
        }
    }

    // Filter binary and non-text / bloat file extensions
    for (const ext of BINARY_OR_IRRELEVANT_EXTENSIONS) {
        if (lower.endsWith(ext)) {
            return false;
        }
    }

    return true;
}

/**
 * Retrieves repository metadata.
 * @param {string} owner
 * @param {string} repo
 */
async function getRepoInfo(owner, repo) {
    try {
        const response = await octokit.rest.repos.get({ owner, repo });
        return response.data;
    } catch (error) {
        if (error.status === 404) {
            throw new Error(`Repository "${owner}/${repo}" not found or is private.`);
        }
        if (error.status === 401 || error.status === 403) {
            throw new Error(`GitHub API authentication error or rate limit exceeded: ${error.message}`);
        }
        throw new Error(`Failed to fetch repository information: ${error.message}`);
    }
}

/**
 * Fetches all indexable files in a repository via GitHub Tree API.
 * Uses HEAD tree directly to eliminate redundant round trips.
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array<{ path: string, sha: string, size: number }> & { branch: string }>}
 */
async function getFiles(owner, repo) {
    try {
        let branch = "HEAD";
        let treeData = null;

        // Try getting tree via HEAD directly (single fast round-trip)
        try {
            const treeResponse = await octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: "HEAD",
                recursive: "true"
            });
            treeData = treeResponse.data;
        } catch {
            // Fallback: lookup default branch and fetch tree
            const repoResponse = await octokit.rest.repos.get({ owner, repo });
            branch = repoResponse.data.default_branch || "main";
            const treeResponse = await octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: "true"
            });
            treeData = treeResponse.data;
        }

        if (!treeData || !treeData.tree) {
            const emptyList = [];
            emptyList.branch = branch;
            return emptyList;
        }

        const usefulFiles = treeData.tree
            .filter(item => item.type === "blob")
            .filter(item => isUsefulFile(item.path, item.size || 0));

        // Sort by architectural priority so key code is indexed first
        usefulFiles.sort((a, b) => scoreFilePath(b.path) - scoreFilePath(a.path));

        // Limit to MAX_FILES_TO_INDEX to prevent hangs on massive repos
        const sliced = usefulFiles.slice(0, MAX_FILES_TO_INDEX || 150);

        const result = sliced.map(item => ({
            path: item.path,
            sha: item.sha,
            size: item.size
        }));

        result.branch = branch;
        return result;
    } catch (error) {
        if (error.status === 404) {
            throw new Error(`Repository "${owner}/${repo}" not found or is private.`);
        }
        if (error.status === 401 || error.status === 403) {
            throw new Error(`GitHub API rate limit exceeded or invalid token: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Fetches file content using raw.githubusercontent.com (fast CDN, no rate limit hit),
 * with fallback to Octokit Git Blob or Repos Content API.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} path
 * @param {string} [branch="HEAD"]
 * @param {string} [sha]
 * @returns {Promise<string>}
 */
async function getFileContent(owner, repo, path, branch = "HEAD", sha = null) {
    // 1. Fast raw CDN fetch (preserves rate limits, no base64 overhead)
    try {
        const encodedPath = path.split("/").map(encodeURIComponent).join("/");
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodedPath}`;
        const headers = {
            "User-Agent": "Github-RAG-Assistant"
        };
        if (GITHUB_TOKEN) {
            headers["Authorization"] = `token ${GITHUB_TOKEN}`;
        }

        const res = await fetch(rawUrl);
        if (res.ok) {
            return await res.text();
        }
    } catch {
        // Fall through to git blob / API fallback
    }

    // 2. Direct Git blob by SHA (faster than repos.getContent)
    if (sha) {
        try {
            const blobRes = await octokit.rest.git.getBlob({
                owner,
                repo,
                file_sha: sha
            });
            if (blobRes.data && blobRes.data.content) {
                return Buffer.from(blobRes.data.content, "base64").toString("utf-8");
            }
        } catch {
            // Fall through to repos.getContent
        }
    }

    // 3. Fallback to repos.getContent
    try {
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path
        });

        if (!response.data || !response.data.content) {
            return "";
        }

        return Buffer.from(response.data.content, "base64").toString("utf-8");
    } catch (error) {
        console.warn(`[GitHub] Could not fetch content for ${path}: ${error.message}`);
        return "";
    }
}

/**
 * Concurrently fetches file contents in parallel batches using a worker pool.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {Array<{ path: string, sha: string }>} files
 * @param {string} [branch="HEAD"]
 * @param {number} [concurrency]
 * @returns {Promise<Array<{ path: string, content: string }>>}
 */
async function getFilesContentBatch(owner, repo, files, branch = "HEAD", concurrency = FETCH_CONCURRENCY || 12) {
    if (!files || files.length === 0) return [];

    const results = new Array(files.length);
    let currentIndex = 0;

    const workerCount = Math.min(concurrency, files.length);
    const workers = Array(workerCount).fill(null).map(async () => {
        while (currentIndex < files.length) {
            const index = currentIndex++;
            const file = files[index];
            const content = await getFileContent(owner, repo, file.path, branch, file.sha);
            results[index] = {
                path: file.path,
                content
            };
        }
    });

    await Promise.all(workers);
    return results.filter(item => item && item.content && item.content.trim().length > 0);
}

module.exports = {
    octokit,
    getRepoInfo,
    getFiles,
    getFileContent,
    getFilesContentBatch
};
