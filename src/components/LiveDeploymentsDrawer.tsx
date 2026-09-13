import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ExternalLink,
  RefreshCw,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Zap,
  Shield,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { GitHubRepo, ProductionDeploymentItem } from '../types';
import { fetchRepoDeployments } from '../services/apiClient';

interface LiveDeploymentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  githubToken?: string;
}

export function LiveDeploymentsDrawer({
  isOpen,
  onClose,
  repos,
  selectedRepo,
  githubToken,
}: LiveDeploymentsDrawerProps) {
  const [deploymentsList, setDeploymentsList] = useState<ProductionDeploymentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProductionDeploymentItem | null>(null);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Speed and Navigation States
  const [embedMode, setEmbedMode] = useState<'direct' | 'proxy'>('direct');
  const [addressBarInput, setAddressBarInput] = useState('');
  const [isNavigatingProgress, setIsNavigatingProgress] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Custom URL Modal / Quick Add Form
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressTimerRef = useRef<any>(null);
  const lastLoadedRepoRef = useRef<string>('');

  // Synchronize address bar when selectedItem changes
  useEffect(() => {
    if (selectedItem?.url) {
      setAddressBarInput(selectedItem.url);
      triggerFastProgress();
    }
  }, [selectedItem?.url, embedMode]);

  // Fast progress animation that finishes in 350ms without blocking view
  const triggerFastProgress = () => {
    setIsNavigatingProgress(true);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => {
      setIsNavigatingProgress(false);
    }, 400);
  };

  // Preconnect and DNS-Prefetch all deployment domains in the background for zero-latency clicks
  useEffect(() => {
    if (deploymentsList.length === 0) return;

    deploymentsList.forEach((item) => {
      try {
        const u = new URL(item.url);
        const origin = u.origin;
        if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
          const preconnect = document.createElement('link');
          preconnect.rel = 'preconnect';
          preconnect.href = origin;
          preconnect.crossOrigin = 'anonymous';
          document.head.appendChild(preconnect);

          const dnsPrefetch = document.createElement('link');
          dnsPrefetch.rel = 'dns-prefetch';
          dnsPrefetch.href = origin;
          document.head.appendChild(dnsPrefetch);
        }
      } catch {
        // ignore invalid URL strings
      }
    });
  }, [deploymentsList]);

  // Collect URLs from repos (homepage) & fetch GitHub deployments with caching
  useEffect(() => {
    if (!isOpen) return;

    const currentRepoKey = selectedRepo?.full_name || '';
    // If already loaded for this repo, don't re-trigger heavy scanner
    if (deploymentsList.length > 0 && lastLoadedRepoRef.current === currentRepoKey) {
      return;
    }

    let isCancelled = false;

    async function loadAllDeployments() {
      setIsLoadingDeployments(true);
      const items: ProductionDeploymentItem[] = [];

      // 1. Gather all repo homepage URLs
      repos.forEach((r) => {
        if (r.homepage && (r.homepage.startsWith('http://') || r.homepage.startsWith('https://'))) {
          let provider = 'Deployed App';
          if (r.homepage.includes('vercel.app')) provider = 'Vercel';
          else if (r.homepage.includes('netlify.app')) provider = 'Netlify';
          else if (r.homepage.includes('github.io')) provider = 'GitHub Pages';
          else if (r.homepage.includes('pages.dev')) provider = 'Cloudflare';
          else if (r.homepage.includes('onrender.com')) provider = 'Render';
          else if (r.homepage.includes('railway.app')) provider = 'Railway';

          items.push({
            id: `homepage-${r.id}`,
            repoFullName: r.full_name,
            repoName: r.name,
            environment: 'Production',
            url: r.homepage,
            provider,
            createdAt: r.updated_at,
          });
        }
      });

      // 2. Fetch repo deployments in parallel via fast backend endpoint
      if (selectedRepo) {
        try {
          const apiDeployments = await fetchRepoDeployments(
            selectedRepo.owner.login,
            selectedRepo.name,
            githubToken
          );
          apiDeployments.forEach((dep) => {
            if (!items.some((i) => i.url.toLowerCase().replace(/\/+$/, '') === dep.url.toLowerCase().replace(/\/+$/, ''))) {
              items.push({
                id: dep.id,
                repoFullName: dep.repoFullName,
                repoName: dep.repoName,
                environment: dep.environment,
                url: dep.url,
                provider: dep.provider,
                createdAt: dep.createdAt,
                creator: dep.creator,
              });
            }
          });
        } catch {
          // ignore
        }
      }

      // 3. Fallback demo items if list is empty so user immediately experiences the feature
      if (items.length === 0 && selectedRepo) {
        const cleanName = selectedRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const cleanOwner = selectedRepo.owner.login.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        items.push({
          id: `preview-gh-${selectedRepo.id}`,
          repoFullName: selectedRepo.full_name,
          repoName: selectedRepo.name,
          environment: 'GitHub Pages',
          url: `https://${cleanOwner}.github.io/${cleanName}`,
          provider: 'GitHub Pages',
          createdAt: selectedRepo.updated_at,
        });

        items.push({
          id: `preview-vercel-${selectedRepo.id}`,
          repoFullName: selectedRepo.full_name,
          repoName: selectedRepo.name,
          environment: 'Vercel Production',
          url: `https://${cleanName}.vercel.app`,
          provider: 'Vercel',
          createdAt: selectedRepo.updated_at,
        });
      }

      if (!isCancelled) {
        lastLoadedRepoRef.current = currentRepoKey;
        setDeploymentsList(items);
        if (items.length > 0 && !selectedItem) {
          setSelectedItem(items[0]);
        }
        setIsLoadingDeployments(false);
      }
    }

    loadAllDeployments();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedRepo?.full_name, repos.length]);

  // Navigate to whatever URL is entered in the address bar
  const handleAddressBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressBarInput.trim()) return;

    let targetUrl = addressBarInput.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    // Check if item already exists in list
    const existing = deploymentsList.find((d) => d.url.toLowerCase() === targetUrl.toLowerCase());
    if (existing) {
      setSelectedItem(existing);
    } else {
      let provider = 'Custom Site';
      if (targetUrl.includes('vercel.app')) provider = 'Vercel';
      else if (targetUrl.includes('netlify.app')) provider = 'Netlify';
      else if (targetUrl.includes('github.io')) provider = 'GitHub Pages';
      else if (targetUrl.includes('onrender.com')) provider = 'Render';

      let domainName = targetUrl.replace(/^https?:\/\//, '').split('/')[0];

      const newItem: ProductionDeploymentItem = {
        id: `custom-nav-${Date.now()}`,
        repoFullName: selectedRepo ? selectedRepo.full_name : 'Custom Link',
        repoName: domainName,
        environment: 'Live Preview',
        url: targetUrl,
        provider,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      setDeploymentsList((prev) => [newItem, ...prev]);
      setSelectedItem(newItem);
    }

    triggerFastProgress();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;

    let formattedUrl = customUrlInput.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let provider = 'Custom URL';
    if (formattedUrl.includes('vercel.app')) provider = 'Vercel';
    else if (formattedUrl.includes('netlify.app')) provider = 'Netlify';
    else if (formattedUrl.includes('github.io')) provider = 'GitHub Pages';
    else if (formattedUrl.includes('pages.dev')) provider = 'Cloudflare';
    else if (formattedUrl.includes('onrender.com')) provider = 'Render';

    const newItem: ProductionDeploymentItem = {
      id: `custom-${Date.now()}`,
      repoFullName: selectedRepo ? selectedRepo.full_name : 'Custom Link',
      repoName: customTitleInput.trim() || 'Live Web App',
      environment: 'Live Preview',
      url: formattedUrl,
      provider,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    setDeploymentsList((prev) => [newItem, ...prev]);
    setSelectedItem(newItem);
    setCustomUrlInput('');
    setCustomTitleInput('');
    setIsAddingCustom(false);
    triggerFastProgress();
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeploymentsList((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem?.id === id) {
      const remaining = deploymentsList.filter((item) => item.id !== id);
      setSelectedItem(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleCopyUrl = () => {
    if (!selectedItem?.url) return;
    navigator.clipboard.writeText(selectedItem.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleReload = () => {
    triggerFastProgress();
    if (iframeRef.current && selectedItem) {
      try {
        const computedSrc =
          embedMode === 'proxy'
            ? `/api/proxy-site?url=${encodeURIComponent(selectedItem.url)}`
            : selectedItem.url;
        iframeRef.current.src = computedSrc;
      } catch {
        // fallback
      }
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'vercel':
        return {
          badgeClass: 'bg-black text-white border border-slate-700',
          symbol: '▲',
        };
      case 'netlify':
        return {
          badgeClass: 'bg-teal-950/80 text-teal-300 border border-teal-700/60',
          symbol: '◆',
        };
      case 'github pages':
        return {
          badgeClass: 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60',
          symbol: '🐙',
        };
      case 'cloudflare':
        return {
          badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-700/60',
          symbol: '⚡',
        };
      case 'render':
        return {
          badgeClass: 'bg-purple-950/80 text-purple-300 border border-purple-700/60',
          symbol: '🚀',
        };
      case 'railway':
        return {
          badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-700/60',
          symbol: '🚂',
        };
      case 'heroku':
        return {
          badgeClass: 'bg-violet-950/80 text-violet-300 border border-violet-700/60',
          symbol: '🟣',
        };
      case 'fly.io':
        return {
          badgeClass: 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-700/60',
          symbol: '🎈',
        };
      case 'firebase':
        return {
          badgeClass: 'bg-orange-950/80 text-orange-300 border border-orange-700/60',
          symbol: '🔥',
        };
      case 'surge':
        return {
          badgeClass: 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60',
          symbol: '🌊',
        };
      case 'aws amplify':
        return {
          badgeClass: 'bg-sky-950/80 text-sky-300 border border-sky-700/60',
          symbol: '☁️',
        };
      case 'supabase':
        return {
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60',
          symbol: '⚡',
        };
      default:
        return {
          badgeClass: 'bg-blue-950/70 text-blue-300 border border-blue-700/60',
          symbol: '🌐',
        };
    }
  };

  if (!isOpen) return null;

  const currentComputedUrl = selectedItem
    ? embedMode === 'proxy'
      ? `/api/proxy-site?url=${encodeURIComponent(selectedItem.url)}`
      : selectedItem.url
    : '';

  return (
    <div
      id="live-deployments-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        id="live-deployments-container"
        className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-[96vw] max-w-7xl h-[92vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/95 shrink-0 z-10">
          {/* Left: Branding & Speed Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
              <Zap className="w-4 h-4 fill-white text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                  <span>Live Site Runner</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Ultra-Fast
                  </span>
                </h2>
                {selectedItem && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
                    <span className="truncate max-w-[180px]">{selectedItem.repoName}</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-300 text-[10px] font-semibold">
                  {deploymentsList.length} {deploymentsList.length === 1 ? 'Site' : 'Sites'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Device Viewport Switcher & Window Controls */}
          <div className="flex items-center gap-2">
            {/* Viewport Mode Switcher */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Desktop View (Edge-to-Edge)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewportMode === 'tablet'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close Live Sites Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body: Left Vertical Links Rail & Pure Full Output on Right */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Vertical Rail: All Live Links */}
          <div className="w-60 sm:w-64 md:w-72 shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col overflow-hidden">
            <div className="p-2.5 border-b border-slate-800/70 flex items-center justify-between shrink-0 bg-slate-900/40">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>All Live URLs</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="px-2 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Add Custom Live URL"
              >
                <Plus className="w-3 h-3" />
                <span>Add URL</span>
              </button>
            </div>

            {/* Add Custom URL Form */}
            {isAddingCustom && (
              <form onSubmit={handleAddCustom} className="p-2.5 border-b border-slate-800/80 bg-slate-900/60 space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-150">
                <input
                  type="text"
                  placeholder="Website Name (e.g. My Portfolio)"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="https://example.vercel.app"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Add Site
                  </button>
                </div>
              </form>
            )}

            {/* Sites List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {isLoadingDeployments && deploymentsList.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Scanning deployments...</span>
                </div>
              )}

              {deploymentsList.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const badge = getProviderBadge(item.provider);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (selectedItem?.id !== item.id) {
                        setSelectedItem(item);
                        triggerFastProgress();
                      }
                    }}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500/70 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950 border-slate-800/60 hover:bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Icon Avatar */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${badge.badgeClass}`}
                      >
                        {badge.symbol}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {item.repoName}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${badge.badgeClass}`}
                          >
                            {item.provider}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {item.url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Direct External Open Shortcut */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-indigo-300 rounded transition-opacity cursor-pointer"
                        title="Open directly in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {item.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                          title="Delete link"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {deploymentsList.length === 0 && !isLoadingDeployments && (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <Globe className="w-6 h-6 mx-auto opacity-40 text-sky-400" />
                  <p>No live deployments found yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Add Live URL
                  </button>
                </div>
              )}
            </div>

            {/* Quick Presets Footer */}
            <div className="p-2 border-t border-slate-800/80 bg-slate-900/30 text-[10px] text-slate-400">
              <span className="block mb-1 font-semibold text-slate-300">Quick URL Presets:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { name: 'Vercel', url: 'https://vercel.com' },
                  { name: 'Netlify', url: 'https://netlify.app' },
                  { name: 'GitHub', url: 'https://github.io' },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setCustomTitleInput(`${p.name} Site`);
                      setCustomUrlInput(p.url);
                      setIsAddingCustom(true);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer"
                  >
                    +{p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Area: Interactive Browser Address Bar & Ultra-Fast Live Sandbox */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden relative">
            {selectedItem ? (
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Browser URL Navigation Bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 shrink-0">
                  {/* Reload Button */}
                  <button
                    type="button"
                    onClick={handleReload}
                    className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                    title="Reload site"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Mode Switcher Button: Direct (Fastest) vs Proxy Unblocker */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = embedMode === 'direct' ? 'proxy' : 'direct';
                      setEmbedMode(nextMode);
                      triggerFastProgress();
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 ${
                      embedMode === 'direct'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/50'
                        : 'bg-indigo-950/70 text-indigo-300 border-indigo-700/50 hover:bg-indigo-900/50'
                    }`}
                    title={
                      embedMode === 'direct'
                        ? 'Direct Ultra-Fast Mode (Click to toggle Unblocker Proxy)'
                        : 'Unblocker Proxy Mode (Bypasses frame restrictions)'
                    }
                  >
                    {embedMode === 'direct' ? (
                      <>
                        <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        <span>Direct Mode</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-indigo-400" />
                        <span>Proxy Unblocker</span>
                      </>
                    )}
                  </button>

                  {/* Interactive Address Bar Form */}
                  <form onSubmit={handleAddressBarSubmit} className="flex-1 flex items-center min-w-0 relative">
                    <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={addressBarInput}
                      onChange={(e) => setAddressBarInput(e.target.value)}
                      placeholder="Enter site URL to run ultra-fast (https://...)"
                      className="w-full pl-8 pr-7 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-400 cursor-pointer"
                      title="Go to URL"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </form>

                  {/* Copy URL Button */}
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={copiedUrl ? 'Copied!' : 'Copy Site URL'}
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Instant Open in New Tab Button (0ms delay) */}
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer shrink-0"
                    title="Open live site in new browser tab instantly"
                  >
                    <span className="hidden sm:inline">Open in Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Sleek Top Progress Bar (Light Speed, Zero Blocking) */}
                <div className="h-0.5 w-full bg-slate-900 overflow-hidden relative shrink-0">
                  {isNavigatingProgress && (
                    <div className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 w-full animate-pulse transition-all duration-300" />
                  )}
                </div>

                {/* Iframe Viewport Container */}
                <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-950 relative">
                  {viewportMode === 'desktop' ? (
                    /* 100% Edge-to-Edge Pure Canvas Output */
                    <iframe
                      ref={iframeRef}
                      src={currentComputedUrl}
                      className="w-full h-full bg-slate-950 border-0"
                      title={`Live output of ${selectedItem.repoName}`}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
                      loading="eager"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    /* Mobile or Tablet Centered Output Frame */
                    <div className="w-full h-full flex items-center justify-center p-3 sm:p-4 bg-slate-900/40">
                      <div
                        className={`h-full max-h-[96vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 transition-all duration-200 flex flex-col relative ${
                          viewportMode === 'mobile' ? 'w-[375px]' : 'w-[768px]'
                        }`}
                      >
                        <iframe
                          ref={iframeRef}
                          src={currentComputedUrl}
                          className="w-full flex-1 bg-slate-950 border-0"
                          title={`Live output of ${selectedItem.repoName}`}
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
                          loading="eager"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  )}

                  {/* Non-intrusive bottom hint bar for sites with strict headers */}
                  <div className="absolute bottom-2 right-3 z-10 opacity-70 hover:opacity-100 transition-opacity bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-2 backdrop-blur-sm shadow-md">
                    <span>Site not loading due to X-Frame-Options?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmbedMode(embedMode === 'direct' ? 'proxy' : 'direct');
                        triggerFastProgress();
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline underline-offset-2"
                    >
                      {embedMode === 'direct' ? 'Switch to Proxy' : 'Switch to Direct'}
                    </button>
                    <span>•</span>
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-0.5"
                    >
                      <span>Open Tab</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                <Globe className="w-10 h-10 text-sky-400/50" />
                <p className="text-sm font-medium text-slate-400">No live deployment selected</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select a site URL from the left rail, or enter any web application address into the top URL bar to preview it at light speed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
