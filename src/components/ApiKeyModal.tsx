import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Trash2, CheckCircle2, ShieldCheck, ExternalLink, X, Github, Sparkles } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey: string;
  onSaveApiKey: (key: string) => void;
  hasEnvKeyFallback: boolean;
  currentGithubToken?: string;
  onSaveGithubToken?: (token: string) => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  currentApiKey,
  onSaveApiKey,
  hasEnvKeyFallback,
  currentGithubToken = '',
  onSaveGithubToken,
}: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<'gemini' | 'github'>('gemini');
  const [keyValue, setKeyValue] = useState(currentApiKey);
  const [githubTokenValue, setGithubTokenValue] = useState(currentGithubToken);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setKeyValue(currentApiKey);
    setGithubTokenValue(currentGithubToken);
  }, [currentApiKey, currentGithubToken, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(keyValue.trim());
    if (onSaveGithubToken) {
      onSaveGithubToken(githubTokenValue.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    if (activeTab === 'gemini') {
      setKeyValue('');
      onSaveApiKey('');
    } else {
      setGithubTokenValue('');
      if (onSaveGithubToken) onSaveGithubToken('');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        id="api-key-modal-card"
        className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          id="close-api-key-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">API Keys & Tokens</h2>
            <p className="text-xs text-slate-400">Save keys safely in your browser's localStorage</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'gemini'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini API Key</span>
            {keyValue ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1"></span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'github'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Token (PAT)</span>
            {githubTokenValue ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1"></span>
            ) : null}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {activeTab === 'gemini' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Google Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                >
                  Get free key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  id="gemini-api-key-input"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {hasEnvKeyFallback && !keyValue && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Default server GEMINI_API_KEY available. Custom key optional.</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  GitHub Personal Access Token (Optional / Recommended)
                </label>
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                >
                  Create token <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  id="github-token-input"
                  type={showGithubToken ? 'text' : 'password'}
                  value={githubTokenValue}
                  onChange={(e) => setGithubTokenValue(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showGithubToken ? 'Hide token' : 'Show token'}
                >
                  {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                GitHub token dalne se rate limit 60 se badhkar <strong>5,000 requests/hour</strong> ho jati hai aur aap apne private repos bhi dekh sakte hain.
              </p>
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tokens are stored only in your local browser storage.</span>
          </div>

          {/* Feedback & Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 p-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear {activeTab === 'gemini' ? 'Gemini Key' : 'GitHub Token'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="save-api-keys-btn"
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Tokens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
