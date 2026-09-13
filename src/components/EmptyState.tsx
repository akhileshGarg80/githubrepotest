import { Sparkles, Code2, Compass, MessageSquare, ShieldCheck, Key, Cpu } from 'lucide-react';
import { FIXED_MODEL } from '../types';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  hasCustomKey: boolean;
  onOpenApiKeyModal: () => void;
}

export function EmptyState({
  onSelectPrompt,
  hasCustomKey,
  onOpenApiKeyModal,
}: EmptyStateProps) {
  const suggestions = [
    {
      icon: <Code2 className="w-4 h-4 text-blue-400" />,
      title: 'Generate TypeScript Code',
      prompt: 'Write a clean TypeScript debounce function with proper generics.',
    },
    {
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      title: 'Explain Complex Concept',
      prompt: 'Explain how tokenization and attention mechanisms work in LLMs.',
    },
    {
      icon: <MessageSquare className="w-4 h-4 text-amber-400" />,
      title: 'Draft a Professional Email',
      prompt: 'Write a polite, concise project update email for stakeholders.',
    },
    {
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      title: 'Creative Brainstorming',
      prompt: 'Suggest 5 innovative SaaS productivity app ideas.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center">
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
        <Sparkles className="w-7 h-7" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
        {FIXED_MODEL.name}
      </h2>
      <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
        Ultra-low latency AI chat with live real-time token tracking for every prompt and response.
      </p>

      {/* Badges container */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            {hasCustomKey ? (
              <span className="text-emerald-300 font-medium">API key saved in localStorage</span>
            ) : (
              <span>
                API key saved in <strong className="text-blue-400">localStorage</strong>
              </span>
            )}
          </span>
          {!hasCustomKey && (
            <button
              onClick={onOpenApiKeyModal}
              className="ml-1 text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              Set Key
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/50 border border-indigo-800/40 text-xs text-indigo-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Token Tracker (Right Panel)</span>
        </div>
      </div>

      {/* Prompt suggestions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 text-left">
        {suggestions.map((item, index) => (
          <button
            key={index}
            id={`suggested-prompt-${index}`}
            onClick={() => onSelectPrompt(item.prompt)}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 font-medium text-slate-200 group-hover:text-white text-xs sm:text-sm">
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-slate-750 transition-colors">
                {item.icon}
              </div>
              <span>{item.title}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400 group-hover:text-slate-300 line-clamp-2 leading-relaxed">
              "{item.prompt}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
