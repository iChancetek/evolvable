/**
 * GitHubIntegrationService
 *
 * Direct GitHub REST API client — no SDK, just fetch.
 * Handles repo creation, branch management, file commits, PRs, and rollback.
 */
export class GitHubIntegrationService {
    private token: string;
    private baseUrl = 'https://api.github.com';
    private rateLimitRemaining = 5000;

    constructor(accessToken: string) {
        this.token = accessToken;
    }

    // ── Low-level helper ──────────────────────────────────────────────────

    private async request<T>(
        method: string,
        path: string,
        body?: any,
        retries = 3
    ): Promise<T> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const res = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Evolvable-Platform/1.0'
                },
                body: body ? JSON.stringify(body) : undefined
            });

            // Rate limit handling
            const remaining = res.headers.get('x-ratelimit-remaining');
            if (remaining) this.rateLimitRemaining = parseInt(remaining);

            if (res.status === 429 || (res.status === 403 && this.rateLimitRemaining === 0)) {
                const resetAt = parseInt(res.headers.get('x-ratelimit-reset') || '0') * 1000;
                const waitMs = Math.max(resetAt - Date.now(), 1000 * attempt);
                console.warn(`[GitHub] Rate limited. Waiting ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (!res.ok && attempt < retries) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                continue;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(`GitHub API Error ${res.status}: ${err.message}`);
            }

            if (res.status === 204) return {} as T;
            return res.json();
        }
        throw new Error(`GitHub API failed after ${retries} attempts`);
    }

    // ── Repository ───────────────────────────────────────────────────────

    async createRepository(
        name: string,
        description: string,
        isPrivate = true
    ): Promise<{ fullName: string; cloneUrl: string; htmlUrl: string; defaultBranch: string }> {
        const repo = await this.request<any>('POST', '/user/repos', {
            name,
            description,
            private: isPrivate,
            auto_init: true,    // Creates initial commit so we have a SHA to branch from
            gitignore_template: 'Node'
        });
        return {
            fullName: repo.full_name,
            cloneUrl: repo.clone_url,
            htmlUrl: repo.html_url,
            defaultBranch: repo.default_branch
        };
    }

    async getRepository(fullName: string): Promise<any> {
        return this.request<any>('GET', `/repos/${fullName}`);
    }

    async getRepositoryInfo(fullName: string): Promise<{
        branches: { name: string; sha: string }[];
        pullRequests: { number: number; title: string; state: string; url: string; head: string; base: string }[];
        commits: { sha: string; message: string; authorName: string; date: string }[];
    }> {
        const [branches, prs, commits] = await Promise.all([
            this.listBranches(fullName),
            this.listPullRequests(fullName),
            this.getCommitHistory(fullName, 'main')
        ]);
        return { branches, pullRequests: prs, commits };
    }

    // ── Branches ─────────────────────────────────────────────────────────

    async getDefaultBranchSha(fullName: string): Promise<string> {
        const repo = await this.request<any>('GET', `/repos/${fullName}`);
        const branch = await this.request<any>('GET', `/repos/${fullName}/branches/${repo.default_branch}`);
        return branch.commit.sha;
    }

    async createBranch(fullName: string, branchName: string, fromSha: string): Promise<string> {
        await this.request('POST', `/repos/${fullName}/git/refs`, {
            ref: `refs/heads/${branchName}`,
            sha: fromSha
        });
        return branchName;
    }

    async listBranches(fullName: string): Promise<{ name: string; sha: string }[]> {
        const branches = await this.request<any[]>('GET', `/repos/${fullName}/branches?per_page=30`);
        return branches.map(b => ({ name: b.name, sha: b.commit.sha }));
    }

    // ── Commits ───────────────────────────────────────────────────────────

    /**
     * Commits multiple files to a branch in one operation using Git Data API
     * (tree + commit objects) — avoids needing to push one file at a time.
     */
    async commitFiles(
        fullName: string,
        branch: string,
        files: Record<string, string>,
        message: string
    ): Promise<string> {
        // 1. Get current tree SHA
        const refData = await this.request<any>('GET', `/repos/${fullName}/git/ref/heads/${branch}`);
        const latestCommitSha = refData.object.sha;
        const commitData = await this.request<any>('GET', `/repos/${fullName}/git/commits/${latestCommitSha}`);
        const baseTreeSha = commitData.tree.sha;

        // 2. Create blob objects for each file
        const treeItems = await Promise.all(
            Object.entries(files).map(async ([filePath, content]) => {
                const blob = await this.request<any>('POST', `/repos/${fullName}/git/blobs`, {
                    content,
                    encoding: 'utf-8'
                });
                return { path: filePath, mode: '100644', type: 'blob', sha: blob.sha };
            })
        );

        // 3. Create new tree
        const newTree = await this.request<any>('POST', `/repos/${fullName}/git/trees`, {
            base_tree: baseTreeSha,
            tree: treeItems
        });

        // 4. Create commit
        const newCommit = await this.request<any>('POST', `/repos/${fullName}/git/commits`, {
            message,
            tree: newTree.sha,
            parents: [latestCommitSha]
        });

        // 5. Update branch ref
        await this.request('PATCH', `/repos/${fullName}/git/refs/heads/${branch}`, {
            sha: newCommit.sha,
            force: false
        });

        return newCommit.sha;
    }

    async getCommitHistory(
        fullName: string,
        branch: string,
        limit = 10
    ): Promise<{ sha: string; message: string; authorName: string; date: string }[]> {
        const commits = await this.request<any[]>('GET', `/repos/${fullName}/commits?sha=${branch}&per_page=${limit}`);
        return commits.map(c => ({
            sha: c.sha.substring(0, 7),
            message: c.commit.message.split('\n')[0],
            authorName: c.commit.author.name,
            date: c.commit.author.date
        }));
    }

    // ── Pull Requests ─────────────────────────────────────────────────────

    async createPullRequest(
        fullName: string,
        head: string,
        base: string,
        title: string,
        body: string
    ): Promise<{ prNumber: number; prUrl: string }> {
        const pr = await this.request<any>('POST', `/repos/${fullName}/pulls`, {
            title,
            body,
            head,
            base
        });
        return { prNumber: pr.number, prUrl: pr.html_url };
    }

    async mergePullRequest(fullName: string, prNumber: number): Promise<string> {
        const result = await this.request<any>('PUT', `/repos/${fullName}/pulls/${prNumber}/merge`, {
            merge_method: 'squash'
        });
        return result.sha;
    }

    async listPullRequests(fullName: string): Promise<{
        number: number; title: string; state: string; url: string; head: string; base: string
    }[]> {
        const prs = await this.request<any[]>('GET', `/repos/${fullName}/pulls?state=all&per_page=20`);
        return prs.map(p => ({
            number: p.number,
            title: p.title,
            state: p.state,
            url: p.html_url,
            head: p.head.ref,
            base: p.base.ref
        }));
    }

    // ── Rollback ──────────────────────────────────────────────────────────

    async createRollbackBranch(
        fullName: string,
        targetCommitSha: string,
        version: number
    ): Promise<{ branchName: string; prNumber: number; prUrl: string }> {
        const branchName = `hotfix/rollback-v${version}`;

        await this.createBranch(fullName, branchName, targetCommitSha);

        const { prNumber, prUrl } = await this.createPullRequest(
            fullName,
            branchName,
            'main',
            `🔄 Rollback to v${version}`,
            `This rollback PR reverts the project to plan version ${version}.\n\nTarget commit: \`${targetCommitSha}\`\n\nGenerated automatically by Evolvable.`
        );

        return { branchName, prNumber, prUrl };
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /**
     * Build a standardized commit message for agent-generated code.
     */
    static buildCommitMessage(opts: {
        platformMode: string;
        planVersion: number;
        featureCount: number;
        pageCount: number;
        apiCount: number;
        agentIds: string[];
        qaCoverage?: number;
        securityCriticals?: number;
    }): string {
        return [
            `feat(plan-v${opts.planVersion}): ${opts.platformMode} — ${opts.featureCount} features generated`,
            '',
            `Agents: ${opts.agentIds.join(', ')}`,
            `Platform: ${opts.platformMode}`,
            `Pages: ${opts.pageCount}`,
            `APIs: ${opts.apiCount}`,
            opts.qaCoverage != null ? `QA: ${opts.qaCoverage}% coverage` : '',
            opts.securityCriticals != null ? `Security: ${opts.securityCriticals} critical findings` : ''
        ].filter(Boolean).join('\n');
    }

    /**
     * One-shot: create repo (if needed), create plan branch, commit all files, open PR.
     * Returns the PR number and URL.
     */
    async commitCodeToRepository(opts: {
        repoFullName?: string;            // existing repo, or leave empty to create
        repoName?: string;                // name to create with
        userId: string;
        planVersion: number;
        platformMode: string;
        files: Record<string, string>;
        commitMessage: string;
    }): Promise<{
        repoFullName: string;
        repoUrl: string;
        branch: string;
        commitSha: string;
        prNumber: number;
        prUrl: string;
    }> {
        let fullName = opts.repoFullName;
        let repoUrl = '';

        // Create repo if it doesn't exist yet
        if (!fullName) {
            const name = opts.repoName || `evolvable-${opts.planVersion}-${Date.now()}`;
            const created = await this.createRepository(
                name,
                `Generated by Evolvable — ${opts.platformMode} platform`,
                true
            );
            fullName = created.fullName;
            repoUrl = created.htmlUrl;
        } else {
            const r = await this.getRepository(fullName);
            repoUrl = r.html_url;
        }

        const branch = `feature/plan-v${opts.planVersion}`;

        // Get main branch SHA to branch from
        const baseSha = await this.getDefaultBranchSha(fullName);
        await this.createBranch(fullName, branch, baseSha);

        // Commit all generated files
        const commitSha = await this.commitFiles(fullName, branch, opts.files, opts.commitMessage);

        // Open PR
        const { prNumber, prUrl } = await this.createPullRequest(
            fullName,
            branch,
            'main',
            `✨ Plan v${opts.planVersion}: ${opts.platformMode}`,
            `## Evolvable Generated Platform\n\n**Platform Type:** ${opts.platformMode}\n**Plan Version:** v${opts.planVersion}\n\n### What was built\n${opts.commitMessage}\n\n---\n*Generated by Evolvable Agentic Pipeline. Review code before merging to production.*`
        );

        return { repoFullName: fullName, repoUrl, branch, commitSha, prNumber, prUrl };
    }
}
