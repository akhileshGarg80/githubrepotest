import { useState } from 'react';
import {
  Compass,
  Network,
  Cpu,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  Code2,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RepoArchitectureDoc, EndpointItem } from '../types';

interface RepoArchitectureViewerProps {
  architectureDoc: RepoArchitectureDoc | null;
  repoFullName: string;
  isAnalyzing: boolean;
  onReAnalyze: () => void;
}

type ArchTab = 'overview' | 'endpoints' | 'architecture' | 'techstack' | 'setup';

function getMethodBadge(method: string) {
  const m = method.toUpperCase();
  if (m === 'GET') {
    return 'bg-emerald-950 text-emerald-300 border-emerald-800/80';
  }
  if (m === 'POST') {
    return 'bg-blue-950 text-blue-300 border-blue-800/80';
  }
  if (m === 'PUT' || m === 'PATCH') {
    return 'bg-amber-950 text-amber-300 border-amber-800/80';
  }
  if (m === 'DELETE') {
    return 'bg-rose-950 text-rose-300 border-rose-800/80';
  }
  return 'bg-purple-950 text-purple-300 border-purple-800/80';
}

export function RepoArchitectureViewer({
  architectureDoc,
  repoFullName,
  isAnalyzing,
  onReAnalyze,
}: RepoArchitectureViewerProps) {
  const [activeTab, setActiveTab] = useState<ArchTab>('overview');
  const [endpointSearch, setEndpointSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadMarkdown = () => {
    if (!architectureDoc) return;
    const content = architectureDoc.fullMarkdown || architectureDoc.coreArchitecture;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${architectureDoc.projectName || 'repo'}-architecture-endpoints.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEndpoints = (architectureDoc?.endpoints || []).filter((ep) => {
    const matchesMethod =
      methodFilter === 'ALL' || ep.method.toUpperCase() === methodFilter;
    const q = endpointSearch.toLowerCase();
    const matchesSearch =
      ep.path.toLowerCase().includes(q) ||
      ep.description.toLowerCase().includes(q) ||
      (ep.fileLocation && ep.fileLocation.toLowerCase().includes(q));
    return matchesMethod && matchesSearch;
  });

  if (isAnalyzing && !architectureDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <h3 className="text-base font-bold text-slate-200">
          Analyzing Repository Architecture & Endpoints...
        </h3>
        <p className="text-xs max-w-md text-slate-400">
          Gemini AI is reading through the repository files, extracting every API endpoint, and synthesizing why and how the project was built.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Header & Actions */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate flex items-center gap-1.5">
              <span>{architectureDoc?.projectName || repoFullName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
                System Blueprint
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
              Purpose (Kyu bana) • Architecture • Complete API Endpoints
            </p>
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onReAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Re-run AI deep scan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Re-Scan</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy(architectureDoc?.fullMarkdown || '')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            title="Copy entire markdown"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy MD</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Download Architecture & Endpoints Markdown"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 px-3 border-b border-slate-800/80 bg-slate-950 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>🎯 Project Purpose (Kyu bana)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('endpoints')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'endpoints'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>🔌 Endpoints ({architectureDoc?.endpoints?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'architecture'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>🏗️ Full Architecture</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('techstack')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'techstack'
              ? 'border-amber-500 text-amber-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>⚙️ Tech Stack</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'setup'
              ? 'border-purple-500 text-purple-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>🚀 Setup Guide</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: Project Purpose & Mission Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Mission Card */}
            <div className="p-4 rounded-xl bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-md space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-white">
                  Why was this project built? (Kyu aur kis liye banaya gaya hai)
                </h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed pl-6">
                {architectureDoc?.projectPurpose ||
                  'Analyzing why this project was built and its primary objectives...'}
              </p>
            </div>

            {/* Endpoints Quick Banner */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-emerald-400" />
                  <span>Discovered API Endpoints & Routes</span>
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Found {architectureDoc?.endpoints?.length || 0} active server routes and API handlers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('endpoints')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>View Endpoints</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Markdown Overview */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="markdown-body bg-transparent text-slate-200 prose prose-invert max-w-none text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {architectureDoc?.coreArchitecture || 'No architecture details available.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Complete Endpoints Directory */}
        {activeTab === 'endpoints' && (
          <div className="space-y-3">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={endpointSearch}
                  onChange={(e) => setEndpointSearch(e.target.value)}
                  placeholder="Filter endpoint path, description, or file..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Method filter chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'ROUTE'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethodFilter(m)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer shrink-0 ${
                      methodFilter === m
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoints List */}
            {filteredEndpoints.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                <Network className="w-8 h-8 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-300">No endpoints found matching filter</p>
                <p className="text-[11px]">
                  Try clearing the search query or selecting 'ALL' methods.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEndpoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs truncate">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadge(
                            ep.method
                          )}`}
                        >
                          {ep.method}
                        </span>
                        <span className="font-semibold text-white truncate">
                          {ep.path}
                        </span>
                      </div>

                      {ep.fileLocation && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          {ep.fileLocation}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {ep.description}
                    </p>

                    {(ep.payload || ep.response) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px] font-mono">
                        {ep.payload && (
                          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            <span className="text-indigo-400 font-bold block mb-0.5">
                              Payload / Query:
                            </span>
                            <span className="text-slate-300">{ep.payload}</span>
                          </div>
                        )}
                        {ep.response && (
                          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            <span className="text-emerald-400 font-bold block mb-0.5">
                              Response:
                            </span>
                            <span className="text-slate-300">{ep.response}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Raw Markdown Table of Endpoints */}
            {architectureDoc?.endpointsMarkdown && (
              <div className="p-4 mt-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <h5 className="text-xs font-bold text-slate-300 mb-2">
                  Markdown Endpoints Directory
                </h5>
                <div className="markdown-body bg-transparent text-slate-200 prose prose-invert max-w-none text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {architectureDoc.endpointsMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Full Architecture & Data Flow */}
        {activeTab === 'architecture' && (
          <div className="space-y-4">
            {architectureDoc?.dataFlow && (
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-1.5">
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Data Flow & System Interaction</span>
                </h5>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {architectureDoc.dataFlow}
                </p>
              </div>
            )}

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="markdown-body bg-transparent text-slate-200 prose prose-invert max-w-none text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {architectureDoc?.fullMarkdown || architectureDoc?.coreArchitecture || 'No architecture details.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Tech Stack Directory */}
        {activeTab === 'techstack' && (
          <div className="space-y-3">
            {architectureDoc?.techStack && architectureDoc.techStack.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {architectureDoc.techStack.map((group, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
                  >
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {group.category}
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-700/80 text-blue-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                Detailed tech stack breakdown is embedded in the Full Architecture view.
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Setup & Execution Guide */}
        {activeTab === 'setup' && (
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="markdown-body bg-transparent text-slate-200 prose prose-invert max-w-none text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {architectureDoc?.setupGuide || '# Setup Guide\n\nRefer to repository README.md.'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
