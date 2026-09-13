import {
  Sparkles,
  Key,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  FolderGit2,
  FolderTree,
  FileCode,
  MessageSquare,
  Github,
  GitCommit,
  GitFork,
  Globe,
  Sun,
  Moon,
  UploadCloud,
  User,
} from 'lucide-react';
import { FIXED_MODEL, GeminiModelOption, GitHubUserProfile } from '../types';

interface HeaderProps {
  hasCustomKey: boolean;
  hasEnvKeyFallback: boolean;
  hasGithubToken: boolean;
  onOpenApiKeyModal: () => void;
  onNewChat: () => void;
  onDeleteChat: () => void;
  onExportChat: () => void;
  messageCount: number;
  isTokenSidebarOpen: boolean;
  onToggleTokenSidebar: () => void;
  totalTokensCount: number;
  isRepoSidebarOpen: boolean;
  onToggleRepoSidebar: () => void;
  isFileSidebarOpen: boolean;
  onToggleFileSidebar: () => void;
  isCodeWorkspaceOpen: boolean;
  onToggleCodeWorkspace: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  isActivityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
  isLiveSitesOpen: boolean;
  onToggleLiveSites: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  selectedModel?: GeminiModelOption;
  selectedRepoName?: string | null;
  onOpenCloneModal?: () => void;
  onOpenSyncModal?: () => void;
  isModified?: boolean;
  onOpenSelfModal?: () => void;
  selfProfile?: GitHubUserProfile | null;
}

export function Header({
  hasCustomKey,
  hasEnvKeyFallback,
  hasGithubToken,
  onOpenApiKeyModal,
  onNewChat,
  onDeleteChat,
  onExportChat,
  messageCount,
  isTokenSidebarOpen,
  onToggleTokenSidebar,
  totalTokensCount,
  isRepoSidebarOpen,
  onToggleRepoSidebar,
  isFileSidebarOpen,
  onToggleFileSidebar,
  isCodeWorkspaceOpen,
  onToggleCodeWorkspace,
  isChatOpen,
  onToggleChat,
  isActivityPanelOpen,
  onToggleActivityPanel,
  isLiveSitesOpen,
  onToggleLiveSites,
  theme,
  onToggleTheme,
  selectedModel,
  selectedRepoName,
  onOpenCloneModal,
  onOpenSyncModal,
  isModified,
  onOpenSelfModal,
  selfProfile,
}: HeaderProps) {
  const activeModel = selectedModel || FIXED_MODEL;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Brand & Panel Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">Gemini Chat</h1>
              {/* Dynamic Model Badge */}
              <div
                id="active-model-header-badge"
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[11px] font-semibold"
                title={`Active Model: ${activeModel.name}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{activeModel.name}</span>
              </div>
            </div>
          </div>

          {/* Panel Toggle Icons */}
          <div className="flex items-center gap-1 ml-1 sm:ml-2 pl-2 border-l border-slate-800">
            {/* 1. Repos Panel Toggle */}
            <button
              type="button"
              onClick={onToggleRepoSidebar}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isRepoSidebarOpen
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle GitHub Repos Panel"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
            </button>

            {/* 2. Files Panel Toggle */}
            <button
              type="button"
              onClick={onToggleFileSidebar}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isFileSidebarOpen
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle Files & Folders Tree Panel"
            >
              <FolderTree className="w-3.5 h-3.5" />
            </button>

            {/* 3. Code Workspace Toggle */}
            <button
              id="top-nav-toggle-code-workspace"
              type="button"
              onClick={onToggleCodeWorkspace}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isCodeWorkspaceOpen
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle Center Code Workspace & Editor"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>

            {/* 4. Chat Panel Toggle */}
            <button
              type="button"
              onClick={onToggleChat}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isChatOpen
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle AI Chat & Code Studio Panel"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            {/* 5. Live Activity Toggle */}
            <button
              type="button"
              onClick={onToggleActivityPanel}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isActivityPanelOpen
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle Right GitHub Live Activity (Commits, Diffs, PRs, Issues)"
            >
              <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline text-[11px]">Live Activity</span>
            </button>

            {/* 6. Live Sites & Production URLs Toggle */}
            <button
              id="top-nav-live-sites-btn"
              type="button"
              onClick={onToggleLiveSites}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLiveSitesOpen
                  ? 'bg-sky-600/25 text-sky-300 border border-sky-500/40 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80 bg-slate-900/60'
              }`}
              title="Live Sites, Production Deployments & Ultra-Fast Web Runner"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-semibold text-slate-200">Live Sites</span>
              <span className="hidden sm:inline-flex items-center text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
                Fast
              </span>
            </button>
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-amber-400 hover:border-slate-700 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>

          {/* Self Account Button in Header */}
          {onOpenSelfModal && (
            <button
              id="top-nav-self-account-btn"
              type="button"
              onClick={onOpenSelfModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                selfProfile
                  ? 'bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border-indigo-700/60'
                  : hasGithubToken
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
              }`}
              title="Apna GitHub Account (Self Mode) - Load personal repos and push directly"
            >
              {selfProfile?.avatar_url ? (
                <img src={selfProfile.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full" />
              ) : (
                <User className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span className="hidden sm:inline">
                {selfProfile ? `@${selfProfile.login}` : 'Self'}
              </span>
              <span className="sm:hidden">Self</span>
            </button>
          )}

          {/* "Sync to GitHub" (Direct Push) Button in Top Nav */}
          {onOpenSyncModal && (
            <button
              id="top-nav-sync-repo-btn"
              type="button"
              onClick={onOpenSyncModal}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-xs active:scale-95 cursor-pointer ${
                isModified
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/60 animate-pulse shadow-md shadow-emerald-600/30'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-emerald-100 border-emerald-800/60'
              }`}
              title="Sync & push changes directly to GitHub repository with commit comment"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-semibold">Sync to GitHub</span>
              <span className="sm:hidden">Sync</span>
              {isModified && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping"></span>
              )}
            </button>
          )}

          {/* "Clone to My GitHub" Button in Top Nav */}
          {onOpenCloneModal && (
            <button
              id="top-nav-clone-repo-btn"
              type="button"
              onClick={onOpenCloneModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/70 to-blue-900/70 hover:from-indigo-800/80 hover:to-blue-800/80 text-indigo-200 hover:text-white text-xs font-semibold border border-indigo-700/50 transition-all shadow-xs active:scale-95 cursor-pointer"
              title={
                selectedRepoName
                  ? `Clone "${selectedRepoName}" to your personal GitHub account`
                  : 'Clone repository to your personal GitHub account'
              }
            >
              <GitFork className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline font-medium">Clone to GitHub</span>
              <span className="sm:hidden">Clone</span>
            </button>
          )}

          {/* "+ New Chat" Button */}
          <button
            id="new-chat-btn"
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-600/30 active:scale-95 cursor-pointer"
            title="Start a new fresh chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          {/* "Delete Chat" Button */}
          <button
            id="delete-chat-btn"
            type="button"
            onClick={onDeleteChat}
            disabled={messageCount === 0}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              messageCount > 0
                ? 'text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 active:scale-95'
                : 'text-slate-500 bg-slate-900/30 border border-slate-800/30 cursor-not-allowed opacity-40'
            }`}
            title={messageCount > 0 ? 'Delete all messages' : 'No messages to delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* API Keys & GitHub Token Modal Button */}
          <button
            id="open-api-key-modal-btn"
            type="button"
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-xs border cursor-pointer ${
              hasCustomKey || hasGithubToken
                ? 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-600'
                : 'bg-amber-950/40 text-amber-300 border-amber-700/60 hover:bg-amber-900/40 animate-pulse'
            }`}
            title="Configure Gemini Key & GitHub Token"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Keys</span>
            {hasGithubToken && <Github className="w-3 h-3 text-slate-400 hidden sm:inline" />}
            {hasCustomKey ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : !hasEnvKeyFallback ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : null}
          </button>

          {/* Export chat button */}
          {messageCount > 0 && (
            <button
              id="export-chat-btn"
              type="button"
              onClick={onExportChat}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors hidden sm:flex items-center justify-center cursor-pointer"
              title="Export conversation as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Token Sidebar button */}
          <button
            id="toggle-token-sidebar-btn"
            type="button"
            onClick={onToggleTokenSidebar}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
              isTokenSidebarOpen
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle Token Counter Sidebar"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px] hidden sm:inline">
              {totalTokensCount > 0 ? `${totalTokensCount.toLocaleString()} t` : 'Tokens'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
