const { Octokit } = require('@octokit/rest');

/**
 * GitHub Sync Service
 * Push research notes to GitHub repositories
 */
class GitHubService {
    /**
     * Get authenticated Octokit instance
     */
    _getOctokit(token) {
        return new Octokit({ auth: token });
    }

    /**
     * Sync markdown content to a GitHub repository
     * @param {string} token - GitHub personal access token
     * @param {string} owner - Repo owner
     * @param {string} repo - Repo name
     * @param {string} filename - File name (without path)
     * @param {string} content - Markdown content
     */
    async syncToRepo(token, owner, repo, filename, content) {
        try {
            const octokit = this._getOctokit(token);

            // Ensure research-notes folder exists by creating/updating file
            const path = `research-notes/${filename}`;
            const message = `📝 ResearchMind AI: Add research note — ${filename}`;

            // Check if file already exists
            let sha;
            try {
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path,
                });
                sha = data.sha;
            } catch {
                // File doesn't exist yet — that's fine
            }

            // Create or update the file
            const result = await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message,
                content: Buffer.from(content).toString('base64'),
                sha, // Include sha if updating existing file
            });

            return {
                success: true,
                url: result.data.content.html_url,
                commit: result.data.commit.sha.substring(0, 7),
                message,
            };
        } catch (error) {
            console.error('GitHub sync error:', error.message);

            if (error.status === 401) {
                throw new Error('GitHub authentication failed — please reconnect your GitHub account');
            }
            if (error.status === 404) {
                throw new Error('Repository not found — check the owner and repo name');
            }
            if (error.status === 403) {
                throw new Error('GitHub API rate limit exceeded — please try again later');
            }

            throw new Error(`GitHub sync failed: ${error.message}`);
        }
    }

    /**
     * List user's repositories
     */
    async listRepos(token) {
        try {
            const octokit = this._getOctokit(token);
            const { data } = await octokit.repos.listForAuthenticatedUser({
                sort: 'updated',
                per_page: 30,
            });
            return data.map((r) => ({
                name: r.name,
                full_name: r.full_name,
                owner: r.owner.login,
                private: r.private,
                url: r.html_url,
            }));
        } catch (error) {
            throw new Error(`Failed to list repos: ${error.message}`);
        }
    }

    /**
     * Verify GitHub token is valid
     */
    async verifyToken(token) {
        try {
            const octokit = this._getOctokit(token);
            const { data } = await octokit.users.getAuthenticated();
            return {
                valid: true,
                username: data.login,
                avatar: data.avatar_url,
            };
        } catch {
            return { valid: false };
        }
    }
}

module.exports = new GitHubService();
