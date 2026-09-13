import {
  GitHubRepo,
  GitHubTreeItem,
  TokenUsage,
  FIXED_MODEL,
  DEFAULT_GEMINI_MODEL,
  GitHubCommitItem,
  GitHubCommitDetail,
  GitHubPullRequestItem,
  GitHubIssueItem,
  CommitAiAnalysisDoc,
} from '../types';
import { parseGitignore, isPathIgnored } from '../utils/gitignore';

/**
 * Safely decodes base64 string with proper UTF-8 and multibyte character support.
 */
export function decodeBase64Utf8(base64: string): string {
  try {
    const clean = base64.replace(/\s/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    try {
      return atob(base64.replace(/\s/g, ''));
    } catch {
      return base64;
    }
  }
}

/**
 * Helper to build GitHub request headers
 */
function getGitHubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * Check backend health status safely
 */
export async function checkBackendHealth(): Promise<{ status: string; hasEnvKey: boolean; isBackendAlive: boolean }> {
  try {
    const res = await fetch('/api/health');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return {
        status: data.status || 'ok',
        hasEnvKey: Boolean(data.hasEnvKey),
        isBackendAlive: true,
      };
    }
  } catch {
    // Backend is unreachable (e.g. running as static site on Vercel/Netlify)
  }
  return { status: 'client-mode', hasEnvKey: false, isBackendAlive: false };
}

/**
 * Fetch repositories:
 * 1. Tries local Express/Vercel serverless /api/github/repos first (with limit=all support).
 * 2. If 404 or HTML response (static host), transparently queries official GitHub API directly across multiple pages.
 */
export async function fetchUserRepos(
  username: string,
  token?: string,
  options?: { limit?: number | 'all' }
): Promise<GitHubRepo[]> {
  const cleanUser = username.trim();
  const cleanToken = token?.trim() || '';
  const limit = options?.limit ?? 'all';

  if (!cleanUser && !cleanToken) {
    throw new Error('Please provide a GitHub username or GitHub Personal Access Token.');
  }

  // 1. Attempt backend proxy first
  try {
    const proxyHeaders: Record<string, string> = {};
    if (cleanToken) proxyHeaders['x-github-token'] = cleanToken;

    const limitQuery = limit === 'all' ? 'limit=all&all=true' : `limit=${limit}`;
    const proxyRes = await fetch(
      `/api/github/repos?username=${encodeURIComponent(cleanUser)}&${limitQuery}`,
      { headers: proxyHeaders }
    );

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const data = await proxyRes.json();
      if (Array.isArray(data.repos)) {
        return data.repos;
      }
    }
  } catch {
    // Fallback to direct client call
  }

  // 2. Direct GitHub API fallback with pagination (works natively on Vercel, Netlify, or any static host)
  const allRepos: GitHubRepo[] = [];
  let page = 1;
  const maxPages = limit === 'all' ? 30 : Math.min(Math.ceil(Number(limit) / 100) || 1, 30);

  while (page <= maxPages) {
    let directUrl = '';
    if (cleanUser) {
      directUrl = `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?per_page=100&page=${page}&sort=updated`;
    } else {
      directUrl = `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`;
    }

    const directRes = await fetch(directUrl, {
      headers: getGitHubHeaders(cleanToken),
    });

    if (!directRes.ok) {
      if (page === 1) {
        let errMessage = `GitHub API error (${directRes.status}): ${directRes.statusText}`;
        try {
          const errJson = await directRes.json();
          if (errJson && errJson.message) errMessage = errJson.message;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }
      break;
    }

    const repos = await directRes.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      break;
    }

    allRepos.push(...repos);
    if (repos.length < 100) {
      break;
    }

    page++;
  }

  return allRepos;
}

/**
 * Fetch Git Tree:
 * 1. Tries /api/github/tree
 * 2. If 404 or HTML response, falls back to direct GitHub Git Trees API + .gitignore fetch
 */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<{ branch: string; items: GitHubTreeItem[]; gitignorePatterns: string[] }> {
  const cleanToken = token?.trim() || '';

  // 1. Attempt backend proxy first
  try {
    const proxyHeaders: Record<string, string> = {};
    if (cleanToken) proxyHeaders['x-github-token'] = cleanToken;

    const proxyRes = await fetch(
      `/api/github/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(
        branch
      )}`,
      { headers: proxyHeaders }
    );

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const data = await proxyRes.json();
      if (Array.isArray(data.items)) {
        return {
          branch: data.branch || branch,
          items: data.items,
          gitignorePatterns: data.gitignorePatterns || ['node_modules', 'dist', '.git', '.next', 'build'],
        };
      }
    }
  } catch {
    // Fallback to direct client call
  }

  // 2. Direct GitHub API fallback
  const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  const treeRes = await fetch(treeUrl, {
    headers: getGitHubHeaders(cleanToken),
  });

  if (!treeRes.ok) {
    let errMsg = `Failed to fetch tree (${treeRes.status}): ${treeRes.statusText}`;
    try {
      const errJson = await treeRes.json();
      if (errJson && errJson.message) errMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const treeData = await treeRes.json();
  const rawTree = Array.isArray(treeData.tree) ? treeData.tree : [];

  // Attempt to fetch .gitignore from repo root
  let patterns: string[] = ['node_modules', 'dist', '.git', '.next', 'build'];
  try {
    const gitignoreRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/.gitignore?ref=${encodeURIComponent(branch)}`,
      { headers: getGitHubHeaders(cleanToken) }
    );
    if (gitignoreRes.ok) {
      const gitignoreJson = await gitignoreRes.json();
      if (gitignoreJson.content) {
        const decoded = decodeBase64Utf8(gitignoreJson.content);
        const parsed = parseGitignore(decoded);
        if (parsed.length > 0) {
          patterns = [...new Set([...patterns, ...parsed])];
        }
      }
    }
  } catch {
    // use default patterns
  }

  const items: GitHubTreeItem[] = rawTree.map((item: any) => ({
    path: item.path,
    mode: item.mode,
    type: item.type === 'blob' ? 'blob' : 'tree',
    sha: item.sha,
    size: item.size,
    ignored: isPathIgnored(item.path, patterns),
  }));

  return {
    branch,
    items,
    gitignorePatterns: patterns,
  };
}

/**
 * Fetch File Content:
 * 1. Tries /api/github/file
 * 2. If 404 or HTML response, falls back to direct GitHub Contents API
 */
export async function fetchRepoFile(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string
): Promise<{ name: string; path: string; sha: string; size: number; content: string }> {
  const cleanToken = token?.trim() || '';

  // 1. Attempt backend proxy first
  try {
    const proxyHeaders: Record<string, string> = {};
    if (cleanToken) proxyHeaders['x-github-token'] = cleanToken;

    const proxyRes = await fetch(
      `/api/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(
        path
      )}&ref=${encodeURIComponent(ref)}`,
      { headers: proxyHeaders }
    );

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const data = await proxyRes.json();
      if (typeof data.content === 'string') {
        return data;
      }
    }
  } catch {
    // Fallback to direct client call
  }

  // 2. Direct GitHub API fallback
  const fileUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;

  const fileRes = await fetch(fileUrl, {
    headers: getGitHubHeaders(cleanToken),
  });

  if (!fileRes.ok) {
    let errMsg = `Failed to fetch file (${fileRes.status}): ${fileRes.statusText}`;
    try {
      const errJson = await fileRes.json();
      if (errJson && errJson.message) errMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const fileData = await fileRes.json();
  let content = '';
  if (fileData.encoding === 'base64' && fileData.content) {
    content = decodeBase64Utf8(fileData.content);
  } else if (typeof fileData.content === 'string') {
    content = fileData.content;
  }

  return {
    name: fileData.name || path.split('/').pop() || path,
    path: fileData.path || path,
    sha: fileData.sha || '',
    size: fileData.size || 0,
    content,
  };
}

/**
 * Direct Gemini REST API Streamer (works directly in browser when on static Vercel/Netlify hosting)
 */
async function streamDirectGeminiRest(options: {
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  onChunk: (text: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const rawModel = (options.model || DEFAULT_GEMINI_MODEL.id).toLowerCase();
  let modelId = 'gemini-3.8-flash';
  if (rawModel.includes('3.8')) modelId = 'gemini-3.8-flash';
  else if (rawModel.includes('3.7')) modelId = 'gemini-3.7-flash';
  else if (rawModel.includes('3.6')) modelId = 'gemini-3.6-flash';
  else if (rawModel.includes('3.5') && rawModel.includes('lite')) modelId = 'gemini-3.5-flash-lite';
  else if (rawModel.includes('3.5')) modelId = 'gemini-3.5-flash';
  else if (rawModel.includes('3.1')) modelId = 'gemini-3.1-flash-lite';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelId
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(options.apiKey.trim())}`;

  const formattedContents = options.messages.map((m) => ({
    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload: any = {
    contents: formattedContents,
    generationConfig: {
      maxOutputTokens: 65536,
    },
  };

  if (options.systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!res.ok) {
    let errMsg = `Gemini API error (${res.status}): ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errMsg = errData.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  if (!res.body) {
    throw new Error('No response stream received from Gemini.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.replace('data: ', '').trim();
      if (dataStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.error) {
          throw new Error(parsed.error.message || 'Gemini error');
        }

        const candidateText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          options.onChunk(candidateText);
        }

        if (parsed.usageMetadata) {
          options.onUsage?.({
            promptTokens: parsed.usageMetadata.promptTokenCount || 0,
            candidatesTokens: parsed.usageMetadata.candidatesTokenCount || 0,
            totalTokens: parsed.usageMetadata.totalTokenCount || 0,
          });
        }
      } catch (err: any) {
        if (err.message && err.message !== 'Unexpected end of JSON input') {
          console.warn('Gemini stream parse warning:', err.message);
        }
      }
    }
  }
}

/**
 * Chat Stream Dispatcher:
 * 1. Tries /api/chat (works when Express backend is running).
 * 2. If /api/chat returns 404 (e.g. Vercel static hosting) or fails and apiKey is present:
 *    Seamlessly streams directly from Google Gemini API via official REST endpoint.
 */
export async function streamGeminiChat(options: {
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  onChunk: (text: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const cleanKey = options.apiKey?.trim() || '';

  // 1. Try local server backend
  let tryBackend = true;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': cleanKey,
      },
      body: JSON.stringify({
        apiKey: cleanKey,
        messages: options.messages,
        systemInstruction: options.systemInstruction,
        model: options.model || DEFAULT_GEMINI_MODEL.id,
      }),
      signal: options.signal,
    });

    const contentType = res.headers.get('content-type') || '';

    // If 404 (Vercel static) or HTML returned (Vercel 404 page)
    if (res.status === 404 || contentType.includes('text/html') || !res.ok) {
      if (cleanKey) {
        // Fallback to direct Gemini REST API stream!
        return await streamDirectGeminiRest(options);
      }
      let errMessage = `Error ${res.status}: ${res.statusText}`;
      try {
        const errData = await res.json();
        if (errData && errData.error) errMessage = errData.error;
      } catch {
        // ignore
      }
      throw new Error(errMessage);
    }

    if (!res.body) throw new Error('No response stream received.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.replace('data: ', '').trim();
        if (dataStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            options.onChunk(parsed.text);
          }
          if (parsed.usage) {
            options.onUsage?.({
              promptTokens: parsed.usage.promptTokens || 0,
              candidatesTokens: parsed.usage.candidatesTokens || 0,
              totalTokens: parsed.usage.totalTokens || 0,
            });
          }
        } catch {
          // ignore chunk parse issues
        }
      }
    }
    return;
  } catch (backendErr: any) {
    if (options.signal?.aborted) throw backendErr;
    // If backend failed (network error, 404, etc.) and we have an API key, fallback directly
    if (cleanKey) {
      return await streamDirectGeminiRest(options);
    }
    throw backendErr;
  }
}

/**
 * Fetch commits for a repository
 */
export async function fetchRepoCommits(
  owner: string,
  repo: string,
  branch?: string,
  token?: string,
  perPage = 30
): Promise<GitHubCommitItem[]> {
  const cleanToken = token?.trim() || '';
  try {
    const headers: Record<string, string> = {};
    if (cleanToken) headers['x-github-token'] = cleanToken;

    let url = `/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&per_page=${perPage}`;
    if (branch) url += `&branch=${encodeURIComponent(branch)}`;

    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.commits)) return data.commits;
    }
  } catch {
    // fallback
  }

  // Direct GitHub API fallback
  let directUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}`;
  if (branch) directUrl += `&sha=${encodeURIComponent(branch)}`;

  const directRes = await fetch(directUrl, { headers: getGitHubHeaders(cleanToken) });
  if (!directRes.ok) {
    throw new Error(`Failed to load commits (${directRes.status})`);
  }
  const commits = await directRes.json();
  return Array.isArray(commits) ? commits : [];
}

/**
 * Fetch detailed commit with file diffs and stats
 */
export async function fetchRepoCommitDetail(
  owner: string,
  repo: string,
  ref: string,
  token?: string
): Promise<GitHubCommitDetail> {
  const cleanToken = token?.trim() || '';
  try {
    const headers: Record<string, string> = {};
    if (cleanToken) headers['x-github-token'] = cleanToken;

    const res = await fetch(
      `/api/github/commit-detail?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // fallback
  }

  const directUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`;
  const directRes = await fetch(directUrl, { headers: getGitHubHeaders(cleanToken) });
  if (!directRes.ok) {
    throw new Error(`Failed to load commit detail (${directRes.status})`);
  }
  return await directRes.json();
}

/**
 * Fetch Pull Requests
 */
export async function fetchRepoPulls(
  owner: string,
  repo: string,
  state = 'all',
  token?: string
): Promise<GitHubPullRequestItem[]> {
  const cleanToken = token?.trim() || '';
  try {
    const headers: Record<string, string> = {};
    if (cleanToken) headers['x-github-token'] = cleanToken;

    const res = await fetch(
      `/api/github/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=${encodeURIComponent(state)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.pulls)) return data.pulls;
    }
  } catch {
    // fallback
  }

  const directUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}&per_page=30&sort=updated`;
  const directRes = await fetch(directUrl, { headers: getGitHubHeaders(cleanToken) });
  if (!directRes.ok) {
    throw new Error(`Failed to load pull requests (${directRes.status})`);
  }
  const pulls = await directRes.json();
  return Array.isArray(pulls) ? pulls : [];
}

/**
 * Fetch Issues
 */
export async function fetchRepoIssues(
  owner: string,
  repo: string,
  state = 'all',
  token?: string
): Promise<GitHubIssueItem[]> {
  const cleanToken = token?.trim() || '';
  try {
    const headers: Record<string, string> = {};
    if (cleanToken) headers['x-github-token'] = cleanToken;

    const res = await fetch(
      `/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=${encodeURIComponent(state)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.issues)) return data.issues;
    }
  } catch {
    // fallback
  }

  const directUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${encodeURIComponent(state)}&per_page=30&sort=updated`;
  const directRes = await fetch(directUrl, { headers: getGitHubHeaders(cleanToken) });
  if (!directRes.ok) {
    throw new Error(`Failed to load issues (${directRes.status})`);
  }
  const issues = await directRes.json();
  const pureIssues = Array.isArray(issues) ? issues.filter((i: any) => !i.pull_request) : [];
  return pureIssues;
}

/**
 * Explain a Commit and its Diffs using Gemini AI
 */
export async function explainCommitWithAI(options: {
  commitDetail: GitHubCommitDetail;
  repoFullName: string;
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<CommitAiAnalysisDoc> {
  const { commitDetail, repoFullName, apiKey, model, signal } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-gemini-api-key'] = apiKey;

  const res = await fetch('/api/github/explain-commit', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      apiKey,
      model: model || DEFAULT_GEMINI_MODEL.id,
      commitSha: commitDetail.sha,
      commitMessage: commitDetail.commit.message,
      authorName: commitDetail.commit.author.name,
      stats: commitDetail.stats,
      files: commitDetail.files?.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch?.slice(0, 2000),
      })),
      repoFullName,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to explain commit (${res.status})`);
  }

  const data = await res.json();
  return {
    sha: commitDetail.sha,
    commitMessage: commitDetail.commit.message,
    authorName: commitDetail.commit.author.name,
    purpose: data.purpose || commitDetail.commit.message,
    filesSummary: `${commitDetail.files?.length || 0} files modified`,
    codeChanges: `+${commitDetail.stats?.additions || 0} / -${commitDetail.stats?.deletions || 0}`,
    impact: 'Modified codebase behavior',
    fullMarkdown: data.markdown || `# Commit ${commitDetail.sha}\n\n${commitDetail.commit.message}`,
    createdAt: Date.now(),
    modelUsed: data.modelUsed || model || DEFAULT_GEMINI_MODEL.id,
  };
}

/**
 * Unified Project Deep Scan (Scans whole project together in 1 pass -> 4 Large Documents)
 */
export async function runUnifiedProjectDeepScan(options: {
  repoFullName: string;
  repoName: string;
  description?: string | null;
  fileList: string[];
  sampleFilesContent: string;
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<{
  projectOverviewDoc: string;
  endpointsDoc: string;
  structureArchitectureDoc: string;
  featuresCatalogDoc: string;
}> {
  const { repoFullName, repoName, description, fileList, sampleFilesContent, apiKey, model, signal } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-gemini-api-key'] = apiKey;

  const res = await fetch('/api/repo/deep-scan', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      apiKey,
      model,
      repoFullName,
      repoName,
      description,
      fileList,
      sampleFilesContent,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Deep scan failed (${res.status})`);
  }

  return await res.json();
}

/**
 * Clone & push currently selected repository to authenticated user's GitHub account
 */
export async function cloneRepoToGitHubAccount(options: {
  sourceOwner: string;
  sourceRepo: string;
  sourceBranch?: string;
  targetRepoName: string;
  targetDescription?: string;
  isPrivate?: boolean;
  cloneType?: 'standalone' | 'fork';
  token?: string;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  method?: 'standalone' | 'fork';
  repo: any;
  filesCount?: number;
  message?: string;
}> {
  const {
    sourceOwner,
    sourceRepo,
    sourceBranch = 'main',
    targetRepoName,
    targetDescription,
    isPrivate = false,
    cloneType = 'standalone',
    token,
    signal,
  } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-github-token'] = token;

  const res = await fetch('/api/github/clone-repo', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token,
      sourceOwner,
      sourceRepo,
      sourceBranch,
      targetRepoName,
      targetDescription,
      isPrivate,
      cloneType,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to clone repository (${res.status})`);
  }

  return await res.json();
}

/**
 * Fetch Live Production Deployments & Environment URLs for a repository
 */
export async function fetchRepoDeployments(
  owner: string,
  repo: string,
  token?: string
): Promise<Array<{
  id: string;
  repoFullName: string;
  repoName: string;
  environment: string;
  url: string;
  creator: string;
  createdAt: string;
  provider: string;
}>> {
  const cleanToken = token?.trim() || '';
  const headers: Record<string, string> = {};
  if (cleanToken) headers['x-github-token'] = cleanToken;

  try {
    const res = await fetch(
      `/api/github/deployments?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deployments)) {
        return data.deployments;
      }
    }
  } catch {
    // fallback or empty
  }

  return [];
}
