import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  GitBranch,
  FileCode,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  UploadCloud,
  Key,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ActiveFile, GitHubRepo } from '../types';
import { commitAndPushFile } from '../services/apiClient';

interface SyncCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRepo: GitHubRepo | null;
  branch: string;
  activeFile: ActiveFile | null;
  githubToken: string;
  onSaveGithubToken: (token: string) => void;
  onSyncSuccess: (commitSha: string, commitMsg: string, updatedSha?: string) => void;
}

export function SyncCommitModal({
  isOpen,
  onClose,
  selectedRepo,
  branch,
  activeFile,
  githubToken,
  onSaveGithubToken,
  onSyncSuccess,
}: SyncCommitModalProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [customBranch, setCustomBranch] = useState(branch || 'main');
  const [tempToken, setTempToken] = useState(githubToken || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ sha: string; message: string } | null>(null);

  // Initialize commit message and branch when activeFile or modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessInfo(null);
      setCustomBranch(branch || selectedRepo?.default_branch || 'main');
      setTempToken(githubToken || '');

      const fileName = activeFile?.name || 'file';
      setCommitMessage(`Update ${fileName}`);
      setCommitDescription('');
    }
  }, [isOpen, activeFile?.name, branch, selectedRepo?.default_branch, githubToken]);

  if (!isOpen) return null;

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const tokenToUse = (githubToken || tempToken).trim();
    if (!tokenToUse) {
      setErrorMessage('GitHub Personal Access Token is required to commit and push changes.');
      return;
    }

    if (!selectedRepo) {
      setErrorMessage('No repository selected.');
      return;
    }

    if (!activeFile) {
      setErrorMessage('No active file selected to commit.');
      return;
    }

    if (!commitMessage.trim()) {
      setErrorMessage('Please enter a commit message / comment.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save token if user entered a new one
      if (tempToken.trim() && tempToken.trim() !== githubToken) {
        onSaveGithubToken(tempToken.trim());
      }

      const fullMessage = commitDescription.trim()
        ? `${commitMessage.trim()}\n\n${commitDescription.trim()}`
        : commitMessage.trim();

      const result = await commitAndPushFile({
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        path: activeFile.path,
        content: activeFile.content,
        message: fullMessage,
        branch: customBranch.trim() || 'main',
        sha: activeFile.sha,
        token: tokenToUse,
      });

      const commitSha = result.commit?.sha || 'HEAD';
      const updatedSha = result.content?.sha;
      setSuccessInfo({
        sha: commitSha.slice(0, 7),
        message: fullMessage,
      });

      onSyncSuccess(commitSha, commitMessage.trim(), updatedSha);

      // Auto close after 1.5 seconds on success
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to commit and push to GitHub.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const QUICK_TEMPLATES = [
    `Update ${activeFile?.name || 'file'}`,
    `Fix issue in ${activeFile?.name || 'component'}`,
    `Refactor ${activeFile?.name || 'code'}`,
    `Optimize performance and clean code`,
    `Sync live modifications to ${selectedRepo?.name || 'repo'}`,
  ];

  return (
    <div
      id="sync-commit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        id="sync-commit-modal"
        className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Sync & Push to GitHub</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Direct Push
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Commit changes directly to{' '}
                <span className="text-indigo-300 font-mono">
                  {selectedRepo ? `${selectedRepo.owner.login}/${selectedRepo.name}` : 'repository'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleCommitSubmit} className="p-5 space-y-4">
          {/* Target File & Branch Info Card */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-slate-800 text-blue-400 shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {activeFile ? activeFile.path : 'No file open'}
                  </span>
                  {activeFile?.isModified ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/50">
                      Modified
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      Synced
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                  <GitBranch className="w-3 h-3 text-indigo-400" />
                  <span>Branch: {customBranch}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-mono block">
                {activeFile ? `${(activeFile.content.length / 1024).toFixed(1)} KB` : ''}
              </span>
            </div>
          </div>

          {/* GitHub Token Field (if not set or allows updating) */}
          {(!githubToken || !githubToken.trim()) && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Personal Access Token (PAT) Required</span>
                </label>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Aynex%20Workspace%20Push"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
                >
                  <span>Generate Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (needs 'repo' write scope)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-amber-800/60 text-slate-100 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-amber-300/80">
                Your token is stored only in your local browser and used to push directly to your repository.
              </p>
            </div>
          )}

          {/* Commit Message Input (Required) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Commit Comment / Message *</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Required for push</span>
            </div>
            <input
              type="text"
              required
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="e.g. Update App.tsx with new UI components"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
            />

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1 pt-1">
              {QUICK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCommitMessage(tmpl)}
                  className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Extended Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Extended Commit Description</span>
              <span className="text-[10px] text-slate-500 font-normal">Optional</span>
            </label>
            <textarea
              rows={2}
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              placeholder="Add details about your changes, bug fixes, or new features..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none font-sans"
            />
          </div>

          {/* Target Branch Override */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">Target Branch:</span>
            </div>
            <input
              type="text"
              value={customBranch}
              onChange={(e) => setCustomBranch(e.target.value)}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono w-28 text-right focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Success Message Banner */}
          {successInfo && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold">Successfully committed and pushed to GitHub!</p>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                  Commit SHA: {successInfo.sha} — "{successInfo.message}"
                </p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">Failed to push commit</p>
                <p className="text-[11px] text-rose-200/90 mt-0.5 break-words">{errorMessage}</p>
                {errorMessage.includes('403') || errorMessage.includes('permission') ? (
                  <p className="text-[10px] text-rose-300 mt-1">
                    Tip: Ensure your GitHub Token has full <span className="font-mono font-bold">repo</span> write
                    scope and that your account has write access to this repository.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!successInfo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pushing to GitHub...</span>
                </>
              ) : successInfo ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Pushed!</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Commit & Push Directly</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
