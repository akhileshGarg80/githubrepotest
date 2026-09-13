import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
  Lock,
  LogOut,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { GitHubUserProfile } from '../types';
import { fetchAuthenticatedUser } from '../services/apiClient';

interface SelfAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken: string;
  onSaveGithubToken: (token: string) => void;
  onSelectSelfAccount: (username: string, profile: GitHubUserProfile) => void;
}

export function SelfAccountModal({
  isOpen,
  onClose,
  githubToken,
  onSaveGithubToken,
  onSelectSelfAccount,
}: SelfAccountModalProps) {
  const [tokenInput, setTokenInput] = useState(githubToken || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);

  // Load user profile if token is already available
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTokenInput(githubToken || '');

      if (githubToken && githubToken.trim()) {
        loadProfile(githubToken.trim());
      } else {
        setUserProfile(null);
      }
    }
  }, [isOpen, githubToken]);

  const loadProfile = async (tok: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const profile = await fetchAuthenticatedUser(tok);
      setUserProfile(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate GitHub token.');
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setErrorMessage('Please enter your GitHub Personal Access Token.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const profile = await fetchAuthenticatedUser(cleanToken);
      setUserProfile(profile);
      onSaveGithubToken(cleanToken);
      onSelectSelfAccount(profile.login, profile);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired GitHub token. Check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMyRepos = () => {
    if (userProfile) {
      onSelectSelfAccount(userProfile.login, userProfile);
      onClose();
    }
  };

  const handleDisconnect = () => {
    onSaveGithubToken('');
    setTokenInput('');
    setUserProfile(null);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div
      id="self-account-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        id="self-account-modal"
        className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>My GitHub Account</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Self Profile
                </span>
              </h2>
              <p className="text-xs text-slate-400">Manage your account & direct push permissions</p>
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

        <div className="p-5 space-y-4">
          {/* If already authenticated profile exists */}
          {userProfile ? (
            <div className="space-y-4">
              {/* User Profile Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.login}
                    className="w-12 h-12 rounded-xl border-2 border-indigo-500/50 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                    {userProfile.login.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{userProfile.name}</h3>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-0.5 shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>Connected</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate mt-0.5">@{userProfile.login}</p>
                  {userProfile.bio && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{userProfile.bio}</p>
                  )}
                </div>
              </div>

              {/* Repositories Stats & Permissions */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Public Repos
                  </span>
                  <span className="text-lg font-bold text-slate-100 mt-0.5 block">
                    {userProfile.public_repos ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold flex items-center justify-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Private Repos</span>
                  </span>
                  <span className="text-lg font-bold text-amber-300 mt-0.5 block">
                    {userProfile.total_private_repos ?? userProfile.owned_private_repos ?? 'Active'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct Commit & Push enabled! Your changes can be pushed instantly to your repos.</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleLoadMyRepos}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderGit2 className="w-4 h-4" />
                  <span>Load All My Repositories Now</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <a
                    href={userProfile.html_url || `https://github.com/${userProfile.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <span>View GitHub Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Disconnect Token</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Token Input Form */
            <form onSubmit={handleVerifyAndConnect} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Connect your own GitHub account</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Using your Personal Access Token (PAT) lets you see all your repos (including private), edit files,
                  and push commits directly with your commit message!
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <span>GitHub Personal Access Token</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Aynex%20Workspace"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                  >
                    <span>Generate Token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500">
                  Tip: Token needs <span className="font-mono font-bold text-slate-400">repo</span> scope so you can push commits directly.
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-[11px]">{errorMessage}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Connect My Account & Load Repos</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
