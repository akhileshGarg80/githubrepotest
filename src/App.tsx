import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { RepoSidebar } from './components/RepoSidebar';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { CodeWorkspace } from './components/CodeWorkspace';
import { ChatPanel } from './components/ChatPanel';
import { GitHubActivityPanel } from './components/GitHubActivityPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CloneRepoModal } from './components/CloneRepoModal';
import { LiveDeploymentsDrawer } from './components/LiveDeploymentsDrawer';
import { TokenSidebar } from './components/TokenSidebar';
import {
  ChatMessage,
  GitHubRepo,
  GitHubTreeItem,
  ActiveFile,
  GeneratedDocs,
  CenterTab,
  RepoAnalysisState,
  FileAnalysisDoc,
  RepoArchitectureDoc,
  GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL,
  GeminiModelOption,
} from './types';
import { calculateByteSize, formatByteSize, estimateTokens, getPayloadAnalytics } from './utils/tokenCalc';
import { isPathIgnored } from './utils/gitignore';
import {
  checkBackendHealth,
  fetchUserRepos,
  fetchRepoTree,
  fetchRepoFile,
  streamGeminiChat,
} from './services/apiClient';
import { runAutoRepoAnalysis } from './services/repoAnalysisService';

const STORAGE_KEY_API_KEY = 'gemini_chat_api_key';
const STORAGE_KEY_GITHUB_TOKEN = 'github_pat_token';
const STORAGE_KEY_GITHUB_USER = 'github_last_username';
const STORAGE_KEY_HISTORY = 'gemini_chat_history';

export default function App() {
  // Authentication & Settings State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '');
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem(STORAGE_KEY_GITHUB_TOKEN) || '');
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);

  // Layout View States
  const [isRepoSidebarOpen, setIsRepoSidebarOpen] = useState<boolean>(true);
  const [isFileSidebarOpen, setIsFileSidebarOpen] = useState<boolean>(true);
  const [isCodeWorkspaceOpen, setIsCodeWorkspaceOpen] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState<boolean>(true);
  const [isTokenSidebarOpen, setIsTokenSidebarOpen] = useState<boolean>(false);
  const [isLiveSitesOpen, setIsLiveSitesOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('gemini_chat_theme') as 'dark' | 'light') || 'dark';
  });
  const [activeCenterTab, setActiveCenterTab] = useState<CenterTab>('code');

  // GitHub State
  const [username, setUsername] = useState<string>(() => localStorage.getItem(STORAGE_KEY_GITHUB_USER) || 'octocat');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [treeItems, setTreeItems] = useState<GitHubTreeItem[]>([]);
  const [branch, setBranch] = useState<string>('main');
  const [gitignorePatterns, setGitignorePatterns] = useState<string[]>([
    'node_modules',
    'dist',
    '.git',
    '.next',
    'build',
    '.cache',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Active File in Code Editor
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);

  // Automated AI Repository Analysis State (Dual Vertical: File MDs + Architecture & Endpoints)
  const [repoAnalysisState, setRepoAnalysisState] = useState<RepoAnalysisState>({
    repoFullName: '',
    isAnalyzing: false,
    currentStep: 'idle',
    statusMessage: '',
    progress: { current: 0, total: 0 },
    fileDocs: {},
    architectureDoc: null,
    activeFileDocPath: null,
    error: null,
  });

  const autoAnalysisAbortRef = useRef<AbortController | null>(null);

  // Generated Documentation (.md files)
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocs>({
    architecture: '',
    endpoints: '',
    setupGuide: '',
    bugAudit: '',
    isGenerating: false,
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Chat & Streaming State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draftAnalytics, setDraftAnalytics] = useState<ReturnType<typeof getPayloadAnalytics> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  // Gemini Chat Model selection (defaults to Gemini 3.5 Flash-Lite)
  const [selectedChatModel, setSelectedChatModel] = useState<GeminiModelOption>(DEFAULT_GEMINI_MODEL);
  // Multi-File Chat Selection State
  const [selectedChatFilePaths, setSelectedChatFilePaths] = useState<string[]>([]);
  const [isMultiFileMode, setIsMultiFileMode] = useState<boolean>(false);
  const fileContentCacheRef = useRef<Record<string, { content: string; language: string; size: number }>>({});

  const handleToggleChatFile = (path: string) => {
    setSelectedChatFilePaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleClearChatFiles = () => {
    setSelectedChatFilePaths([]);
  };

  const handleSelectAllChatFiles = (paths: string[]) => {
    setSelectedChatFilePaths(paths);
  };

  const handleToggleMultiFileMode = () => {
    setIsMultiFileMode((prev) => !prev);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  // Check server health on mount
  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setHasEnvKey(data.hasEnvKey);
      })
      .catch((err) => console.warn('Could not check server health:', err));
  }, []);

  // Synchronize document theme class for Light / Dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  // Fetch initial repos on mount
  useEffect(() => {
    if (username) {
      handleFetchRepos(username);
    }
  }, []);

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to persist chat messages to localStorage', e);
    }
  }, [messages]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  const handleSaveApiKey = (newKey: string) => {
    const trimmed = newKey.trim();
    setApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
    showToast('Gemini API Key updated');
  };

  const handleSaveGithubToken = (newToken: string) => {
    const trimmed = newToken.trim();
    setGithubToken(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_GITHUB_TOKEN, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_GITHUB_TOKEN);
    }
    showToast('GitHub Token updated');
  };

  // Fetch user repositories (supports loading all repositories)
  const handleFetchRepos = async (userToFetch?: string, limit: number | 'all' = 'all') => {
    const targetUser = (userToFetch || username).trim();
    if (!targetUser && !githubToken) return;

    setIsLoadingRepos(true);
    setRepoError(null);

    try {
      if (targetUser) {
        localStorage.setItem(STORAGE_KEY_GITHUB_USER, targetUser);
      }
      const reposList = await fetchUserRepos(targetUser, githubToken, { limit });
      setRepos(reposList);
      if (reposList && reposList.length > 0 && !selectedRepo) {
        // Auto select first repo
        handleSelectRepo(reposList[0]);
      }
    } catch (err: any) {
      setRepoError(err.message || 'Error fetching repositories.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Trigger automated AI deep analysis for selected repository
  const triggerAutoAnalysisForRepo = async (
    repo: GitHubRepo,
    items: GitHubTreeItem[],
    branchName: string,
    patterns: string[]
  ) => {
    // Abort any ongoing analysis
    if (autoAnalysisAbortRef.current) {
      autoAnalysisAbortRef.current.abort();
    }

    const abortController = new AbortController();
    autoAnalysisAbortRef.current = abortController;

    const keyToUse = apiKey || '';

    try {
      await runAutoRepoAnalysis({
        repo,
        treeItems: items,
        branch: branchName,
        gitignorePatterns: patterns,
        githubToken,
        apiKey: keyToUse,
        signal: abortController.signal,
        onProgress: (partial) => {
          setRepoAnalysisState((prev) => ({
            ...prev,
            ...partial,
            fileDocs: partial.fileDocs ? { ...prev.fileDocs, ...partial.fileDocs } : prev.fileDocs,
          }));
        },
        onArchitectureComplete: (archDoc) => {
          setRepoAnalysisState((prev) => ({
            ...prev,
            architectureDoc: archDoc,
          }));
          setGeneratedDocs((prev) => ({
            ...prev,
            architecture: archDoc.coreArchitecture || archDoc.fullMarkdown,
            endpoints: archDoc.endpointsMarkdown,
            setupGuide: archDoc.setupGuide,
          }));
        },
        onFileDocComplete: (fileDoc) => {
          setRepoAnalysisState((prev) => ({
            ...prev,
            fileDocs: {
              ...prev.fileDocs,
              [fileDoc.path]: fileDoc,
            },
          }));
        },
      });

      showToast(`AI analysis completed for ${repo.name}!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Auto analysis error:', err);
        setRepoAnalysisState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: err.message || 'Analysis failed',
        }));
      }
    }
  };

  // Select a repository -> automatically loads tree AND starts AI dual vertical analysis
  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setIsLoadingTree(true);
    setTreeItems([]);
    setActiveFile(null);

    // Reset repo analysis state
    setRepoAnalysisState({
      repoFullName: repo.full_name,
      isAnalyzing: true,
      currentStep: 'scanning_tree',
      statusMessage: `Scanning tree for ${repo.name}...`,
      progress: { current: 0, total: 0 },
      fileDocs: {},
      architectureDoc: null,
      activeFileDocPath: null,
      error: null,
    });

    try {
      const data = await fetchRepoTree(
        repo.owner.login,
        repo.name,
        repo.default_branch,
        githubToken
      );

      const resolvedBranch = data.branch || repo.default_branch;
      const resolvedPatterns = data.gitignorePatterns || gitignorePatterns;
      const items: GitHubTreeItem[] = data.items || [];

      setBranch(resolvedBranch);
      setTreeItems(items);
      if (data.gitignorePatterns) {
        setGitignorePatterns(data.gitignorePatterns);
      }

      // Automatically launch AI repository dual analysis without user prompt
      triggerAutoAnalysisForRepo(repo, items, resolvedBranch, resolvedPatterns);

      // Try to auto-open README.md or package.json
      const readmeItem = items.find((i) => i.path.toLowerCase() === 'readme.md');
      const packageItem = items.find((i) => i.path.toLowerCase() === 'package.json');
      const targetFile = readmeItem || packageItem || items.find((i) => i.type === 'blob');

      if (targetFile) {
        handleSelectFile(targetFile.path, repo, resolvedBranch);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not load repo files');
      setRepoAnalysisState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: err.message,
      }));
    } finally {
      setIsLoadingTree(false);
    }
  };

  // Select a file from tree to view/edit in Code Editor
  const handleSelectFile = async (filePath: string, repoOverride?: GitHubRepo, branchOverride?: string) => {
    const repo = repoOverride || selectedRepo;
    if (!repo) return;

    try {
      const ref = branchOverride || branch || repo.default_branch;
      const data = await fetchRepoFile(repo.owner.login, repo.name, filePath, ref, githubToken);

      const ext = data.name.split('.').pop() || '';
      fileContentCacheRef.current[data.path] = {
        content: data.content,
        language: ext,
        size: data.size,
      };

      setActiveFile({
        path: data.path,
        name: data.name,
        content: data.content,
        size: data.size,
        language: ext,
        isModified: false,
      });

      // Also sync active file doc in analysis state
      setRepoAnalysisState((prev) => ({
        ...prev,
        activeFileDocPath: filePath,
      }));

      setActiveCenterTab('code');
    } catch (err: any) {
      showToast(err.message || 'Failed to open file');
    }
  };

  const handleSaveFileLocal = () => {
    if (!activeFile) return;
    setActiveFile({
      ...activeFile,
      isModified: false,
    });
    showToast(`Saved changes to ${activeFile.name}`);
  };

  // Re-run deep scan manually
  const handleTriggerDeepScan = () => {
    if (!selectedRepo) {
      showToast('Pehle koi repository select karein');
      return;
    }
    triggerAutoAnalysisForRepo(selectedRepo, treeItems, branch, gitignorePatterns);
  };

  // Chat message send handler with multi-file or active file context
  const handleSendMessage = async (
    text: string,
    options?: {
      mode?: 'chat' | 'code';
      includeFile?: boolean;
      useMultiFiles?: boolean;
      selectedFilePaths?: string[];
      model?: string;
    }
  ) => {
    if (!text.trim() || isStreaming) return;

    const keyToUse = apiKey || '';
    if (!keyToUse && !hasEnvKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    const chosenModelOption = options?.model
      ? GEMINI_MODELS.find((m) => m.id === options.model) || selectedChatModel
      : selectedChatModel;

    let enrichedPrompt = text;
    const isCodeMode = options?.mode === 'code';

    // Multi-File Context integration
    const targetFilePaths =
      options?.useMultiFiles && options?.selectedFilePaths && options.selectedFilePaths.length > 0
        ? options.selectedFilePaths
        : isMultiFileMode && selectedChatFilePaths.length > 0
        ? selectedChatFilePaths
        : [];

    if (targetFilePaths.length > 0 && selectedRepo) {
      const loadedFiles: Array<{ path: string; content: string; language: string }> = [];
      const ref = branch || selectedRepo.default_branch;

      showToast(`Loading ${targetFilePaths.length} file(s) for AI context...`);

      for (const filePath of targetFilePaths) {
        if (fileContentCacheRef.current[filePath]) {
          loadedFiles.push({
            path: filePath,
            ...fileContentCacheRef.current[filePath],
          });
        } else if (activeFile && activeFile.path === filePath) {
          loadedFiles.push({
            path: filePath,
            content: activeFile.content,
            language: activeFile.language,
          });
          fileContentCacheRef.current[filePath] = {
            content: activeFile.content,
            language: activeFile.language,
            size: activeFile.size || activeFile.content.length,
          };
        } else {
          try {
            const data = await fetchRepoFile(
              selectedRepo.owner.login,
              selectedRepo.name,
              filePath,
              ref,
              githubToken
            );
            const ext = data.name.split('.').pop() || '';
            fileContentCacheRef.current[filePath] = {
              content: data.content,
              language: ext,
              size: data.size,
            };
            loadedFiles.push({
              path: filePath,
              content: data.content,
              language: ext,
            });
          } catch (e: any) {
            console.warn(`Could not load ${filePath} for chat context:`, e);
          }
        }
      }

      if (loadedFiles.length > 0) {
        const fileBlocks = loadedFiles
          .map(
            (f, i) =>
              `=== FILE [${i + 1}/${loadedFiles.length}]: "${f.path}" (${f.language}) ===\n\`\`\`${f.language}\n${f.content.slice(0, 50000)}\n\`\`\``
          )
          .join('\n\n');

        enrichedPrompt = `[Multi-File Context: Repository "${selectedRepo.full_name}" - ${loadedFiles.length} files attached]\n\n${fileBlocks}\n\n=== USER REQUEST ===\n${text}`;
      }
    } else if (options?.includeFile && activeFile) {
      enrichedPrompt = `[Context: Active File "${activeFile.path}" (${activeFile.language})]\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\`\n\nUser Request: ${text}`;
    }

    if (isCodeMode) {
      enrichedPrompt += `\n\n[Instruction: Provide the updated or newly generated code in a clean markdown code block \`\`\`${activeFile?.language || 'typescript'} ... \`\`\` so the user can directly apply it to their code workspace.]`;
    }

    const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(4)}`;
    const assistantMessageId = `msg-${Date.now() + 1}-${Math.random().toString(36).substring(4)}`;

    const userBytes = calculateByteSize(text);
    const userFormattedSize = formatByteSize(userBytes);
    const estimatedInputTokens = estimateTokens(text);

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      inputTokens: estimatedInputTokens,
      byteSize: userBytes,
      formattedSize: userFormattedSize,
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelId: chosenModelOption.id,
      modelName: chosenModelOption.name,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages([...updatedMessages, initialAssistantMessage]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const chatPayload = updatedMessages.map((m, idx) => {
        if (idx === updatedMessages.length - 1) {
          return { role: m.role, content: enrichedPrompt };
        }
        return { role: m.role, content: m.content };
      });

      let accumulatedContent = '';
      await streamGeminiChat({
        apiKey: keyToUse,
        messages: chatPayload,
        model: chosenModelOption.id,
        signal: abortController.signal,
        onChunk: (chunkText) => {
          accumulatedContent += chunkText;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg
            )
          );
        },
        onUsage: (usageData) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === assistantMessageId) {
                return { ...msg, tokenUsage: usageData };
              }
              if (msg.id === userMessageId) {
                return { ...msg, inputTokens: usageData.promptTokens };
              }
              return msg;
            })
          );
        },
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId && !msg.content
              ? { ...msg, content: '_Response stopped by user._' }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: err.message || 'An error occurred.', error: true }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  // Apply code generated by AI directly into the active file in the center Code Editor
  const handleApplyCodeToFile = (code: string, targetPath?: string) => {
    if (activeFile) {
      setActiveFile({
        ...activeFile,
        content: code,
        isModified: true,
      });
      setActiveCenterTab('code');
      showToast(`Applied generated code to ${activeFile.name}`);
    } else {
      const filename = targetPath || 'generated_file.ts';
      setActiveFile({
        path: filename,
        name: filename.split('/').pop() || filename,
        content: code,
        size: calculateByteSize(code),
        language: filename.split('.').pop() || 'typescript',
        isModified: true,
      });
      setActiveCenterTab('code');
      showToast(`Created new file in editor: ${filename}`);
    }
  };

  const handleNewChat = () => {
    handleStopStreaming();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    showToast('Nayi chat shuru ho gayi!');
  };

  const handleDeleteChat = () => {
    if (messages.length === 0) {
      showToast('Koi message nahi hai delete karne ke liye.');
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    handleStopStreaming();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    showToast('Chat poori tarah delete ho gayi!');
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let markdown = `# Gemini 3.5 Flash-Lite Chat History\n*Date: ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((m) => {
      const roleLabel = m.role === 'user' ? '### 🧑 User' : '### 🤖 Gemini 3.5 Flash-Lite';
      markdown += `${roleLabel}\n\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini-chat-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalTokensCount = messages.reduce((acc, msg) => {
    return acc + (msg.tokenUsage ? msg.tokenUsage.totalTokens : 0);
  }, 0);

  return (
    <div
      id="app-root-view"
      className={`app-root-container flex flex-col h-screen antialiased overflow-hidden font-sans selection:bg-blue-600 selection:text-white ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'light bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <Header
        hasCustomKey={Boolean(apiKey)}
        hasEnvKeyFallback={hasEnvKey}
        hasGithubToken={Boolean(githubToken)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onExportChat={handleExportChat}
        messageCount={messages.length}
        isTokenSidebarOpen={isTokenSidebarOpen}
        onToggleTokenSidebar={() => setIsTokenSidebarOpen(!isTokenSidebarOpen)}
        totalTokensCount={totalTokensCount}
        isRepoSidebarOpen={isRepoSidebarOpen}
        onToggleRepoSidebar={() => setIsRepoSidebarOpen(!isRepoSidebarOpen)}
        isFileSidebarOpen={isFileSidebarOpen}
        onToggleFileSidebar={() => setIsFileSidebarOpen(!isFileSidebarOpen)}
        isCodeWorkspaceOpen={isCodeWorkspaceOpen}
        onToggleCodeWorkspace={() => setIsCodeWorkspaceOpen(!isCodeWorkspaceOpen)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isActivityPanelOpen={isActivityPanelOpen}
        onToggleActivityPanel={() => setIsActivityPanelOpen(!isActivityPanelOpen)}
        isLiveSitesOpen={isLiveSitesOpen}
        onToggleLiveSites={() => setIsLiveSitesOpen(!isLiveSitesOpen)}
        theme={theme}
        onToggleTheme={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          localStorage.setItem('gemini_chat_theme', next);
        }}
        selectedModel={selectedChatModel}
        selectedRepoName={selectedRepo?.full_name}
        onOpenCloneModal={() => setIsCloneModalOpen(true)}
      />

      {/* 5-Pane Workspace Layout with GitHub Live Activity Panel & Code Workspace Toggle */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Pane 1: GitHub Repositories (Vertical Left) */}
        <RepoSidebar
          repos={repos}
          selectedRepo={selectedRepo}
          onSelectRepo={handleSelectRepo}
          username={username}
          onChangeUsername={setUsername}
          onFetchRepos={handleFetchRepos}
          isLoading={isLoadingRepos}
          isOpen={isRepoSidebarOpen}
          onToggle={() => setIsRepoSidebarOpen(false)}
          error={repoError}
        />

        {/* Pane 2: File & Folder Tree (Adjacent Vertical Left) */}
        <FileTreeSidebar
          repo={selectedRepo}
          treeItems={treeItems}
          branch={branch}
          activeFile={activeFile}
          onSelectFile={(path) => handleSelectFile(path)}
          onTriggerDeepScan={handleTriggerDeepScan}
          isScanning={repoAnalysisState.isAnalyzing || isScanning}
          gitignorePatterns={gitignorePatterns}
          isLoadingTree={isLoadingTree}
          isOpen={isFileSidebarOpen}
          onToggle={() => setIsFileSidebarOpen(false)}
          selectedChatFilePaths={selectedChatFilePaths}
          onToggleChatFile={handleToggleChatFile}
          isMultiSelectMode={isMultiFileMode}
          onToggleMultiSelectMode={handleToggleMultiFileMode}
          onClearChatFiles={handleClearChatFiles}
        />

        {/* Pane 3: Center Code Workspace & Editor */}
        {isCodeWorkspaceOpen && (
          <CodeWorkspace
            activeFile={activeFile}
            onChangeFileContent={(content) => {
              if (activeFile) {
                setActiveFile({ ...activeFile, content, isModified: true });
              }
            }}
            onSaveFile={handleSaveFileLocal}
            onAskGeminiAboutFile={(prompt) => {
              setIsChatOpen(true);
              handleSendMessage(prompt, { mode: 'chat', includeFile: true });
            }}
            activeCenterTab={activeCenterTab}
            onChangeCenterTab={setActiveCenterTab}
            onOpenFileInEditor={(path) => handleSelectFile(path)}
          />
        )}

        {/* Pane 4: Gemini AI Chat Panel */}
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          hasKeyReady={Boolean(apiKey || hasEnvKey)}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          activeFile={activeFile}
          onApplyCodeToFile={handleApplyCodeToFile}
          onDraftChange={setDraftAnalytics}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(false)}
          treeItems={treeItems}
          selectedChatFilePaths={selectedChatFilePaths}
          onToggleChatFile={handleToggleChatFile}
          onClearChatFiles={handleClearChatFiles}
          onSelectAllChatFiles={handleSelectAllChatFiles}
          isMultiFileMode={isMultiFileMode}
          onToggleMultiFileMode={handleToggleMultiFileMode}
          selectedRepo={selectedRepo}
          selectedChatModel={selectedChatModel}
          onSelectChatModel={setSelectedChatModel}
        />

        {/* Pane 5: GitHub Live Activity (Right Vertical: Commits, Diffs, PRs, Issues) */}
        <GitHubActivityPanel
          repo={selectedRepo}
          branch={branch}
          githubToken={githubToken}
          apiKey={apiKey}
          isOpen={isActivityPanelOpen}
          onClose={() => setIsActivityPanelOpen(false)}
          onOpenFileInEditor={(path) => handleSelectFile(path)}
        />

        {/* Rightmost Vertical Token Counter Sidebar */}
        <TokenSidebar
          messages={messages}
          isOpen={isTokenSidebarOpen}
          onClose={() => setIsTokenSidebarOpen(false)}
          isStreaming={isStreaming}
          draftAnalytics={draftAnalytics}
        />
      </div>

      {/* Live Sites & Deployments Modal Drawer */}
      <LiveDeploymentsDrawer
        isOpen={isLiveSitesOpen}
        onClose={() => setIsLiveSitesOpen(false)}
        repos={repos}
        selectedRepo={selectedRepo}
        githubToken={githubToken}
      />

      {/* API Key & GitHub Token Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentApiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        hasEnvKeyFallback={hasEnvKey}
        currentGithubToken={githubToken}
        onSaveGithubToken={handleSaveGithubToken}
      />

      {/* Clone & Push to GitHub Modal */}
      <CloneRepoModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        selectedRepo={selectedRepo}
        branch={branch}
        treeItems={treeItems}
        githubToken={githubToken}
        onSaveGithubToken={handleSaveGithubToken}
        onSuccessClone={(newRepo) => {
          setRepos((prev) => [newRepo, ...prev.filter((r) => r.id !== newRepo.id)]);
          setSelectedRepo(newRepo);
          setToastMessage(`Switched to cloned repository: ${newRepo.full_name}`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* Confirm Delete Chat Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        messageCount={messages.length}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          id="app-toast-message"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-indigo-500/40 text-slate-100 text-xs font-semibold shadow-xl shadow-black/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
