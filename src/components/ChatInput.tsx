import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Square, Sparkles, Key, Cpu, HardDrive, FileText, X, AlertCircle } from 'lucide-react';
import { getPayloadAnalytics } from '../utils/tokenCalc';
import { GeminiModelOption, GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  hasKeyReady: boolean;
  onOpenApiKeyModal: () => void;
  selectedModel?: GeminiModelOption;
  onSelectModel?: (model: GeminiModelOption) => void;
  selectedModelName?: string;
  onDraftChange?: (analytics: ReturnType<typeof getPayloadAnalytics> | null) => void;
}

export function ChatInput({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  hasKeyReady,
  onOpenApiKeyModal,
  selectedModel,
  onSelectModel,
  selectedModelName,
  onDraftChange,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentModel = selectedModel || DEFAULT_GEMINI_MODEL;
  const activeModelTitle = selectedModelName || currentModel.name;

  // Compute live analytics
  const analytics = getPayloadAnalytics(input);
  const hasContent = input.trim().length > 0;

  // Inform parent of live drafting analytics
  useEffect(() => {
    if (onDraftChange) {
      onDraftChange(hasContent ? analytics : null);
    }
  }, [input, hasContent]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleClear = () => {
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Determine size category for styling
  const isVeryLarge = analytics.bytes >= 500 * 1024; // >= 500 KB
  const isMediumLarge = analytics.bytes >= 50 * 1024; // >= 50 KB

  return (
    <div className="border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Banner if no API key is detected */}
        {!hasKeyReady && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Chat shuru karne ke liye apni Gemini API key set karein (localStorage me save hogi).</span>
            </div>
            <button
              id="set-key-inline-btn"
              type="button"
              onClick={onOpenApiKeyModal}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors shrink-0 ml-2 cursor-pointer"
            >
              Add API Key
            </button>
          </div>
        )}

        {/* Input box container */}
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-lg shadow-black/20">
          <textarea
            id="chat-textarea-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeModelTitle}... (paste text, code, or large data)`}
            className="w-full pl-4 pr-14 pt-3 pb-3 sm:pb-3 bg-transparent text-slate-100 placeholder:text-slate-500 text-sm sm:text-base resize-none focus:outline-none max-h-52 leading-relaxed"
          />

          {/* Action buttons inside textarea */}
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
            {hasContent && !isStreaming && (
              <button
                id="clear-input-btn"
                type="button"
                onClick={handleClear}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {isStreaming ? (
              <button
                id="stop-streaming-btn"
                type="button"
                onClick={onStopStreaming}
                className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
                title="Stop generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                id="send-message-btn"
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md cursor-pointer ${
                  input.trim()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Typing Analytics Bar (Live Token & KB/MB Display) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
          {hasContent ? (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
              {/* Live Token Count Badge */}
              <div
                id="live-token-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-mono text-xs font-semibold shadow-xs"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Live Tokens:</span>
                <span className="text-white font-bold">~{analytics.tokens.toLocaleString()}</span>
              </div>

              {/* Live Payload Size Badge (KB / MB) */}
              <div
                id="live-size-badge"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-xs font-semibold shadow-xs ${
                  isVeryLarge
                    ? 'bg-purple-950/80 border-purple-600 text-purple-300'
                    : isMediumLarge
                    ? 'bg-amber-950/80 border-amber-700/70 text-amber-300'
                    : 'bg-blue-950/80 border-blue-700/60 text-blue-300'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>Payload Size:</span>
                <span className="text-white font-bold">{analytics.formattedSize}</span>
              </div>

              {/* Characters and Words Info */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                <FileText className="w-3 h-3 text-slate-500" />
                <span>{analytics.chars.toLocaleString()} chars</span>
                <span className="text-slate-600">•</span>
                <span>{analytics.words.toLocaleString()} words</span>
              </div>

              {/* Large data notification banner */}
              {isVeryLarge && (
                <div className="inline-flex items-center gap-1 text-[11px] text-purple-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Large Payload Detected (Gemini 3.5 supports up to 1M tokens)</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-slate-400">Model:</span>
                <select
                  id="chat-input-model-selector"
                  value={currentModel.id}
                  onChange={(e) => {
                    const chosen = GEMINI_MODELS.find((m) => m.id === e.target.value) || DEFAULT_GEMINI_MODEL;
                    onSelectModel?.(chosen);
                  }}
                  className="bg-slate-900 text-amber-300 font-semibold text-[11px] border border-slate-700/80 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                      {m.name} {m.id === DEFAULT_GEMINI_MODEL.id ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Type ya paste karein live token & size dekhne ke liye</span>
            </div>
          )}

          {/* Shortcut hint */}
          <div className="text-[11px] text-slate-500 hidden sm:block ml-auto">
            <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">Shift+Enter</kbd> for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
