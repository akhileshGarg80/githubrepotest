import { useState, useEffect } from 'react';
import {
  GitCommit,
  GitPullRequest,
  AlertCircle,
  FileCode2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Download,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Minus,
  ArrowLeft,
  X,
  Clock,
  User,
  Cpu,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GitHubRepo,
  GitHubCommitItem,
  GitHubCommitDetail,
  GitHubPullRequestItem,
  GitHubIssueItem,
  CommitAiAnalysisDoc,
  GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL,
  GeminiModelOption,
} from '../types';
import {
  fetchRepoCommits,
  fetchRepoCommitDetail,
  fetchRepoPulls,
  fetchRepoIssues,
  explainCommitWithAI,
} from '../services/apiClient';

interface GitHubActivityPanelProps {
  repo: GitHubRepo | null;
  branch: string;
  githubToken?: string;
  apiKey?: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenFileInEditor?: (filePath: string) => void;
}

type ActivityTab = 'commits' | 'pulls' | 'issues';
type CommitViewSubTab = 'diff' | 'ai_doc';

export function GitHubActivityPanel({
  repo,
  branch,
  githubToken,
  apiKey,
  isOpen,
  onClose,
  onOpenFileInEditor,
}: GitHubActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('commits');
  const [commitSubTab, setCommitSubTab] = useState<CommitViewSubTab>('diff');

  // Activity data
  const [commits, setCommits] = useState<GitHubCommitItem[]>([]);
  const [pulls, setPulls] = useState<GitHubPullRequestItem[]>([]);
  const [issues, setIssues] = useState<GitHubIssueItem[]>([]);

  // Selected Commit details
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [selectedCommitDetail, setSelectedCommitDetail] = useState<GitHubCommitDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Commit AI Analysis Doc
  const [selectedCommitModel, setSelectedCommitModel] = useState<GeminiModelOption>(DEFAULT_GEMINI_MODEL);
  const [aiDocs, setAiDocs] = useState<Record<string, CommitAiAnalysisDoc>>({});
  const [aiDocErrors, setAiDocErrors] = useState<Record<string, string>>({});
  const [isGeneratingAiDoc, setIsGeneratingAiDoc] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load activity when repo or branch changes
  useEffect(() => {
    if (!repo) {
      setCommits([]);
      setPulls([]);
      setIssues([]);
      setSelectedCommitSha(null);
      setSelectedCommitDetail(null);
      return;
    }
    loadActivityData();
  }, [repo?.full_name, branch]);

  const loadActivityData = async () => {
    if (!repo) return;
    setIsLoading(true);
    setError(null);

    try {
      const [commitsData, pullsData, issuesData] = await Promise.allSettled([
        fetchRepoCommits(repo.owner.login, repo.name, branch, githubToken, 30),
        fetchRepoPulls(repo.owner.login, repo.name, 'all', githubToken),
        fetchRepoIssues(repo.owner.login, repo.name, 'all', githubToken),
      ]);

      if (commitsData.status === 'fulfilled') {
        setCommits(commitsData.value);
        // If no commit selected, default to latest
        if (commitsData.value.length > 0 && !selectedCommitSha) {
          handleSelectCommit(commitsData.value[0].sha);
        }
      }
      if (pullsData.status === 'fulfilled') {
        setPulls(pullsData.value);
      }
      if (issuesData.status === 'fulfilled') {
        setIssues(issuesData.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load GitHub activity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCommit = async (sha: string) => {
    if (!repo) return;
    setSelectedCommitSha(sha);
    setIsLoadingDetail(true);

    try {
      const detail = await fetchRepoCommitDetail(repo.owner.login, repo.name, sha, githubToken);
      setSelectedCommitDetail(detail);

      // Auto-trigger AI explanation if not yet generated
      if (!aiDocs[sha]) {
        generateAiExplanation(detail, selectedCommitModel.id);
      }
    } catch (err: any) {
      console.warn('Could not fetch commit detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const generateAiExplanation = async (commitDetail: GitHubCommitDetail, modelId?: string) => {
    if (!repo || isGeneratingAiDoc) return;
    setIsGeneratingAiDoc(true);
    const targetModelId = modelId || selectedCommitModel.id;
    setAiDocErrors((prev) => {
      const next = { ...prev };
      delete next[commitDetail.sha];
      return next;
    });

    try {
      const doc = await explainCommitWithAI({
        commitDetail,
        repoFullName: repo.full_name,
        apiKey,
        model: targetModelId,
      });
      setAiDocs((prev) => ({
        ...prev,
        [commitDetail.sha]: doc,
      }));
    } catch (err: any) {
      const errMsg = err.message || 'Failed to generate commit explanation with AI';
      console.warn('Failed to generate commit AI doc:', errMsg);
      setAiDocErrors((prev) => ({
        ...prev,
        [commitDetail.sha]: errMsg,
      }));
    } finally {
      setIsGeneratingAiDoc(false);
    }
  };

  const generateLocalSummaryDoc = (commitDetail: GitHubCommitDetail) => {
    const filesList = (commitDetail.files || [])
      .map(
        (f) =>
          `### 📄 \`${f.filename}\` (\`${f.status}\`, +${f.additions} / -${f.deletions})\n- **Role in Commit**: Modified for "${commitDetail.commit.message}"\n- **Changes**: ${f.additions} additions, ${f.deletions} deletions`
      )
      .join('\n\n');

    const fallbackMarkdown = `# 📦 Commit Review & Architecture Docs: \`${commitDetail.sha.slice(0, 7)}\`

> **Commit**: ${commitDetail.commit.message}  
> **Author**: ${commitDetail.commit.author.name} | **Date**: ${new Date(commitDetail.commit.author.date).toLocaleString()}  
> **Stats**: Total changes ${commitDetail.stats?.total || 0} (+${commitDetail.stats?.additions || 0} / -${commitDetail.stats?.deletions || 0}) across ${commitDetail.files?.length || 0} files

---

## 🎯 1. Master Purpose & Overall Intent (Kyu Aur Kya Banane Ki Koshish Ki Gayi)
- **Primary Goal & Intent**: ${commitDetail.commit.message}
- **Global Scope of Changes**: This commit affects ${commitDetail.files?.length || 0} files across the repository to implement the requested changes and updates.
- **Architectural Impact**: Updates repository files with +${commitDetail.stats?.additions || 0} lines added and -${commitDetail.stats?.deletions || 0} lines removed.

---

## 📂 2. File-by-File Documentation & Breakdown (Neeche Har File Ka Short Doc)
${filesList || 'No file changes recorded.'}

---

## 📊 3. Summary & Verification
- **Total Files Touched**: ${commitDetail.files?.length || 0}
- **Verification Status**: Ready for review and testing against repository components.

*Note: Generated using local Git diff parser.*`;

    setAiDocs((prev) => ({
      ...prev,
      [commitDetail.sha]: {
        sha: commitDetail.sha,
        commitMessage: commitDetail.commit.message,
        authorName: commitDetail.commit.author.name,
        purpose: commitDetail.commit.message,
        filesSummary: `${commitDetail.files?.length || 0} files modified`,
        codeChanges: `+${commitDetail.stats?.additions || 0} / -${commitDetail.stats?.deletions || 0}`,
        impact: 'Repository source modification',
        fullMarkdown: fallbackMarkdown,
        createdAt: Date.now(),
      },
    }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentAiDoc = selectedCommitSha ? aiDocs[selectedCommitSha] : null;

  return (
    <div
      id="github-live-activity-panel"
      className="w-96 shrink-0 border-l border-slate-800/80 bg-slate-950 flex flex-col h-full z-20 shadow-2xl transition-all"
    >
      {/* Panel Top Header */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200">GitHub Live Activity</h3>
            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
              {repo ? repo.name : 'No repo selected'} ({branch})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={loadActivityData}
            disabled={isLoading || !repo}
            title="Refresh Live Data"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Activity Tabs: Commits | Pull Requests | Issues */}
      <div className="flex items-center border-b border-slate-800/80 bg-slate-900/40 px-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('commits')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'commits'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>Commits ({commits.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pulls')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'pulls'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>PRs ({pulls.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'issues'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Issues ({issues.length})</span>
        </button>
      </div>

      {/* Tab 1: Commits & Diffs View */}
      {activeTab === 'commits' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Commits Scroller */}
          <div className="max-h-48 border-b border-slate-800/80 overflow-y-auto divide-y divide-slate-800/40 bg-slate-900/20">
            {commits.map((c) => {
              const isSelected = c.sha === selectedCommitSha;
              const dateStr = new Date(c.commit.author.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={c.sha}
                  type="button"
                  onClick={() => handleSelectCommit(c.sha)}
                  className={`w-full text-left p-2.5 flex items-start gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                      : 'hover:bg-slate-900/60 border-l-2 border-transparent'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 shrink-0 overflow-hidden mt-0.5">
                    {c.author?.avatar_url ? (
                      <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.commit.author.name.slice(0, 1).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-200 truncate">
                        {c.commit.message.split('\n')[0]}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 shrink-0">
                        {c.sha.slice(0, 7)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="truncate">{c.commit.author.name}</span>
                      <span>•</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {commits.length === 0 && !isLoading && (
              <div className="p-6 text-center text-slate-500 text-xs">
                No commits found on branch {branch}
              </div>
            )}
          </div>

          {/* Detailed Commit Diff & AI Explainer Pane */}
          {selectedCommitDetail ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
              {/* Commit Detail Header */}
              <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    Commit {selectedCommitDetail.sha.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedCommitDetail.stats && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        <span className="text-emerald-400">+{selectedCommitDetail.stats.additions}</span>{' '}
                        <span className="text-rose-400">-{selectedCommitDetail.stats.deletions}</span>
                      </span>
                    )}
                    <a
                      href={selectedCommitDetail.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-slate-200"
                      title="View on GitHub"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-medium leading-snug line-clamp-2">
                  {selectedCommitDetail.commit.message}
                </p>

                {/* Sub-Tabs: Diff vs AI Explainer Doc with Gemini Model Selector */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCommitSubTab('diff')}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        commitSubTab === 'diff'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      File Diffs ({selectedCommitDetail.files?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommitSubTab('ai_doc')}
                      className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                        commitSubTab === 'ai_doc'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>AI Commit Doc</span>
                    </button>

                    {/* Gemini Model Selector next to AI Commit Doc button */}
                    <div
                      className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5"
                      title="Choose Gemini Model for Commit Analysis"
                    >
                      <Cpu className="w-3 h-3 text-amber-400 shrink-0" />
                      <select
                        id="commit-gemini-model-selector"
                        value={selectedCommitModel.id}
                        onChange={(e) => {
                          const chosen = GEMINI_MODELS.find((m) => m.id === e.target.value) || DEFAULT_GEMINI_MODEL;
                          setSelectedCommitModel(chosen);
                          if (selectedCommitDetail) {
                            generateAiExplanation(selectedCommitDetail, chosen.id);
                          }
                        }}
                        className="bg-transparent text-amber-300 text-[11px] font-medium focus:outline-none cursor-pointer"
                      >
                        {GEMINI_MODELS.map((m) => (
                          <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                            {m.name} {m.id === 'gemini-3.5-flash-lite' ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {commitSubTab === 'ai_doc' && selectedCommitDetail && (
                      <button
                        type="button"
                        onClick={() => generateAiExplanation(selectedCommitDetail, selectedCommitModel.id)}
                        disabled={isGeneratingAiDoc}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title={`Re-run explanation with ${selectedCommitModel.name}`}
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isGeneratingAiDoc ? 'animate-spin' : ''}`} />
                        <span>Run {selectedCommitModel.shortName}</span>
                      </button>
                    )}
                  </div>

                  {commitSubTab === 'ai_doc' && currentAiDoc && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(currentAiDoc.fullMarkdown)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title="Copy Markdown"
                      >
                        {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            `commit-${selectedCommitDetail.sha.slice(0, 7)}-explanation.md`,
                            currentAiDoc.fullMarkdown
                          )
                        }
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title="Download Markdown"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-View 1: Color-coded Patch Diff Viewer */}
              {commitSubTab === 'diff' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {selectedCommitDetail.files?.map((file) => (
                    <div
                      key={file.filename}
                      className="rounded-lg border border-slate-800/80 bg-slate-900/50 overflow-hidden"
                    >
                      {/* File header */}
                      <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileCode2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => onOpenFileInEditor?.(file.filename)}
                            className="font-mono text-slate-200 hover:text-indigo-300 hover:underline truncate cursor-pointer text-left"
                            title="Open in Code Editor"
                          >
                            {file.filename}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
                          <span className="text-emerald-400">+{file.additions}</span>
                          <span className="text-rose-400">-{file.deletions}</span>
                          <span className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] uppercase">
                            {file.status}
                          </span>
                        </div>
                      </div>

                      {/* Patch Diff Box */}
                      {file.patch ? (
                        <div className="p-2 font-mono text-[11px] leading-snug overflow-x-auto bg-slate-950/90 max-h-56">
                          {file.patch.split('\n').map((line, idx) => {
                            let lineClass = 'text-slate-400';
                            if (line.startsWith('+') && !line.startsWith('+++')) {
                              lineClass = 'bg-emerald-950/40 text-emerald-300 font-medium px-1 rounded-xs';
                            } else if (line.startsWith('-') && !line.startsWith('---')) {
                              lineClass = 'bg-rose-950/40 text-rose-300 font-medium px-1 rounded-xs';
                            } else if (line.startsWith('@@')) {
                              lineClass = 'bg-blue-950/30 text-blue-300 italic px-1';
                            }

                            return (
                              <div key={idx} className={`whitespace-pre py-0.5 ${lineClass}`}>
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-[11px] text-slate-500 italic">
                          Binary file or large diff preview omitted.
                        </div>
                      )}
                    </div>
                  ))}

                  {(!selectedCommitDetail.files || selectedCommitDetail.files.length === 0) && (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No changed files found in this commit.
                    </div>
                  )}
                </div>
              )}

              {/* Sub-View 2: AI Commit Explanation Document */}
              {commitSubTab === 'ai_doc' && (
                <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none text-slate-300 text-xs">
                  {isGeneratingAiDoc ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
                      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                      <h4 className="text-xs font-semibold text-slate-300">
                        Analyzing Commit & Diffs with Gemini...
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Extracting code modifications, file changes, and architectural impact.
                      </p>
                    </div>
                  ) : currentAiDoc ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] not-prose">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-slate-400">Generated by:</span>
                          <span className="font-semibold text-amber-300">
                            {GEMINI_MODELS.find((m) => m.id === currentAiDoc.modelUsed)?.name || currentAiDoc.modelUsed || selectedCommitModel.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => generateAiExplanation(selectedCommitDetail, selectedCommitModel.id)}
                          disabled={isGeneratingAiDoc}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Re-run explanation with ${selectedCommitModel.name}`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-run ({selectedCommitModel.shortName})</span>
                        </button>
                      </div>
                      <div className="markdown-body bg-transparent text-slate-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {currentAiDoc.fullMarkdown}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      {selectedCommitSha && aiDocErrors[selectedCommitSha] ? (
                        <div className="w-full p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-left space-y-2">
                          <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                            <span>AI Commit Explanation Error</span>
                          </div>
                          <p className="text-[11px] text-rose-200/90 leading-relaxed break-words">
                            {aiDocErrors[selectedCommitSha]}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => generateAiExplanation(selectedCommitDetail, selectedCommitModel.id)}
                              className="px-2.5 py-1 rounded-md bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry with {selectedCommitModel.shortName}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => generateLocalSummaryDoc(selectedCommitDetail)}
                              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
                            >
                              Quick Local Doc
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400">No AI document generated yet.</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => generateAiExplanation(selectedCommitDetail, selectedCommitModel.id)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generate AI Explanation ({selectedCommitModel.shortName})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => generateLocalSummaryDoc(selectedCommitDetail)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                            >
                              Quick Doc
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500 text-xs">
              Select a commit above to view its live code diff and AI explanation.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pull Requests List */}
      {activeTab === 'pulls' && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2">
          {pulls.map((pr) => (
            <div key={pr.id} className="p-2.5 rounded-lg hover:bg-slate-900/50 transition-colors space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-200 line-clamp-2">
                  #{pr.number} {pr.title}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    pr.state === 'open'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}
                >
                  {pr.state}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>By {pr.user.login}</span>
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ))}

          {pulls.length === 0 && !isLoading && (
            <div className="p-6 text-center text-slate-500 text-xs">
              No pull requests found for this repository.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Issues List */}
      {activeTab === 'issues' && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2">
          {issues.map((issue) => (
            <div key={issue.id} className="p-2.5 rounded-lg hover:bg-slate-900/50 transition-colors space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-200 line-clamp-2">
                  #{issue.number} {issue.title}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    issue.state === 'open'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {issue.state}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  By {issue.user.login} • {issue.comments} comments
                </span>
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ))}

          {issues.length === 0 && !isLoading && (
            <div className="p-6 text-center text-slate-500 text-xs">
              No issues found for this repository.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
