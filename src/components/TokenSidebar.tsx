import { Cpu, ArrowUpRight, ArrowDownLeft, Hash, MessageSquare, Layers, Sparkles, X, HardDrive, FileText, Activity } from 'lucide-react';
import { ChatMessage } from '../types';
import { formatByteSize, calculateByteSize } from '../utils/tokenCalc';

interface TokenSidebarProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  isStreaming: boolean;
  draftAnalytics?: {
    bytes: number;
    formattedSize: string;
    tokens: number;
    chars: number;
    words: number;
  } | null;
}

export function TokenSidebar({
  messages,
  isOpen,
  onClose,
  isStreaming,
  draftAnalytics,
}: TokenSidebarProps) {
  // Group messages into conversation turns (User question + Assistant response)
  const turns: Array<{
    turnIndex: number;
    userMessage: ChatMessage;
    assistantMessage?: ChatMessage;
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    userSize: string;
    assistantSize: string;
    isGenerating?: boolean;
  }> = [];

  let currentTurnIndex = 1;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const nextMsg = messages[i + 1];
      const assistantMsg = nextMsg && nextMsg.role === 'assistant' ? nextMsg : undefined;

      // Extract tokens
      let promptTokens = 0;
      let candidatesTokens = 0;
      let totalTokens = 0;

      if (assistantMsg?.tokenUsage) {
        promptTokens = assistantMsg.tokenUsage.promptTokens;
        candidatesTokens = assistantMsg.tokenUsage.candidatesTokens;
        totalTokens = assistantMsg.tokenUsage.totalTokens;
      } else {
        // Fallback approximation
        promptTokens = msg.inputTokens || Math.max(1, Math.ceil(msg.content.trim().length / 4));
        if (assistantMsg && assistantMsg.content) {
          candidatesTokens = Math.max(1, Math.ceil(assistantMsg.content.trim().length / 4));
          totalTokens = promptTokens + candidatesTokens;
        }
      }

      const userBytes = msg.byteSize || calculateByteSize(msg.content);
      const userSize = msg.formattedSize || formatByteSize(userBytes);

      const assistantBytes = assistantMsg ? calculateByteSize(assistantMsg.content) : 0;
      const assistantSize = formatByteSize(assistantBytes);

      const isCurrentGenerating = isStreaming && (!assistantMsg || (assistantMsg && !assistantMsg.tokenUsage));

      turns.push({
        turnIndex: currentTurnIndex++,
        userMessage: msg,
        assistantMessage: assistantMsg,
        promptTokens,
        candidatesTokens,
        totalTokens,
        userSize,
        assistantSize,
        isGenerating: isCurrentGenerating,
      });

      if (assistantMsg) {
        i++; // skip assistant message since it is paired
      }
    }
  }

  // Cumulative tokens
  const totalPromptTokens = turns.reduce((acc, t) => acc + t.promptTokens, 0);
  const totalCandidatesTokens = turns.reduce((acc, t) => acc + t.candidatesTokens, 0);
  const grandTotalTokens = totalPromptTokens + totalCandidatesTokens;

  const hasActiveDraft = Boolean(draftAnalytics && draftAnalytics.bytes > 0);

  return (
    <aside
      id="token-vertical-sidebar"
      className={`${
        isOpen ? 'flex' : 'hidden'
      } flex-col w-56 sm:w-60 md:w-64 shrink-0 border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-md h-full z-20 transition-all`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-2.5 py-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1 truncate">
              <span>Token Tracker</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 font-normal border border-indigo-800/40 shrink-0">
                KB/MB
              </span>
            </h2>
          </div>
        </div>

        {/* Close button */}
        <button
          id="close-token-sidebar-btn"
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer shrink-0"
          title="Close token panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cumulative Overview Card */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/40">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
            <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Conversation
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">
              {turns.length} {turns.length === 1 ? 'Turn' : 'Turns'}
            </span>
          </div>

          <div className="text-xl font-bold font-mono text-white tracking-tight my-0.5 flex items-baseline gap-1.5">
            {grandTotalTokens.toLocaleString()}
            <span className="text-[11px] font-normal font-sans text-slate-400">tokens</span>
          </div>

          {/* Prompt vs Response Breakdown */}
          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
            {/* Sent (You) */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-center">
              <div className="flex items-center justify-center text-[9px] text-blue-400 font-medium">
                <span className="flex items-center gap-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5 text-blue-400" />
                  Sent
                </span>
              </div>
              <div className="text-xs font-bold font-mono text-slate-100 mt-0.5 truncate">
                {totalPromptTokens.toLocaleString()}
              </div>
              {hasActiveDraft && (
                <div className="text-[9px] text-indigo-300 font-mono mt-0.5 truncate">
                  +~{draftAnalytics?.tokens} draft
                </div>
              )}
            </div>

            {/* AI Output */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-center">
              <div className="flex items-center justify-center text-[9px] text-emerald-400 font-medium">
                <span className="flex items-center gap-0.5">
                  <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-400" />
                  Output
                </span>
              </div>
              <div className="text-xs font-bold font-mono text-slate-100 mt-0.5 truncate">
                {totalCandidatesTokens.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Message / Turn Token Boxes + Live Drafting Box */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {/* Live Typing Card (Updates in Real-Time as User Types or Pastes) */}
        {hasActiveDraft && draftAnalytics && (
          <div
            id="live-drafting-card"
            className="p-2.5 rounded-xl bg-indigo-950/40 border-2 border-indigo-500/70 shadow-lg shadow-indigo-950/40 text-xs animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-indigo-800/50">
              <div className="flex items-center gap-1 font-bold text-indigo-200 text-[11px] truncate">
                <Activity className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                <span className="truncate">Live Drafting</span>
              </div>
              <span className="px-1 py-0.2 rounded bg-indigo-900 text-indigo-200 text-[9px] font-mono border border-indigo-700/60 shrink-0">
                Typing
              </span>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {/* Live Size */}
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-indigo-900/60 text-center">
                <div className="text-[9px] text-blue-400 font-semibold flex items-center justify-center gap-0.5">
                  <HardDrive className="w-2.5 h-2.5" />
                  Size
                </div>
                <div className="text-xs font-bold font-mono text-white mt-0.5 truncate">
                  {draftAnalytics.formattedSize}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {draftAnalytics.bytes} B
                </div>
              </div>

              {/* Live Tokens */}
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-indigo-900/60 text-center">
                <div className="text-[9px] text-indigo-300 font-semibold flex items-center justify-center gap-0.5">
                  <Cpu className="w-2.5 h-2.5" />
                  Tokens
                </div>
                <div className="text-xs font-bold font-mono text-indigo-200 mt-0.5 truncate">
                  ~{draftAnalytics.tokens}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {draftAnalytics.chars} chars
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          <span>Har Message Ka Data</span>
          <span>{turns.length} Turn{turns.length === 1 ? '' : 's'}</span>
        </div>

        {turns.length === 0 && !hasActiveDraft ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">Abhi koi message nahi hai</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Message type ya send karein. Har message ka exact token aur KB/MB size yahan live calculate hoga.
            </p>
          </div>
        ) : (
          turns.map((turn) => (
            <div
              key={`turn-${turn.turnIndex}-${turn.userMessage.id}`}
              id={`token-box-turn-${turn.turnIndex}`}
              className={`p-2 rounded-xl border transition-all text-xs ${
                turn.isGenerating
                  ? 'bg-indigo-950/20 border-indigo-700/60 shadow-md shadow-indigo-950/30'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700/80 shadow-xs'
              }`}
            >
              {/* Card Header: Turn index + Status */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-slate-400">
                <div className="flex items-center gap-1 font-semibold text-slate-200 text-[11px]">
                  <Hash className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>Turn #{turn.turnIndex}</span>
                </div>
                {turn.isGenerating ? (
                  <span className="flex items-center gap-1 text-[9px] text-amber-400 animate-pulse font-medium">
                    <Sparkles className="w-2.5 h-2.5" />
                    Counting...
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(turn.userMessage.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {/* User snippet preview */}
              <p className="text-[10px] text-slate-300 line-clamp-1 my-1.5 italic">
                "{turn.userMessage.content}"
              </p>

              {/* 3-Part Token Breakdown Box */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950/70 rounded-lg p-1.5 border border-slate-800/50 text-center font-mono">
                {/* User Input Tokens & Size */}
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-blue-400 font-sans uppercase tracking-tight flex items-center gap-0.5">
                    <ArrowUpRight className="w-2 h-2" />
                    Sent
                  </span>
                  <span className="text-[11px] font-bold text-slate-100 mt-0.5 truncate">
                    {turn.promptTokens}
                  </span>
                  <span className="text-[8px] text-blue-400/90 font-sans mt-0.5 bg-blue-950/60 px-1 py-0.2 rounded border border-blue-900/40 truncate">
                    {turn.userSize}
                  </span>
                </div>

                {/* AI Output Tokens & Size */}
                <div className="flex flex-col items-center border-x border-slate-800/60">
                  <span className="text-[8px] text-emerald-400 font-sans uppercase tracking-tight flex items-center gap-0.5">
                    <ArrowDownLeft className="w-2 h-2" />
                    Output
                  </span>
                  <span className="text-[11px] font-bold text-slate-100 mt-0.5 truncate">
                    {turn.candidatesTokens}
                  </span>
                  <span className="text-[8px] text-emerald-400/90 font-sans mt-0.5 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-900/40 truncate">
                    {turn.assistantSize}
                  </span>
                </div>

                {/* Turn Total Tokens */}
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-indigo-400 font-sans uppercase tracking-tight">
                    Total
                  </span>
                  <span className="text-[11px] font-bold text-indigo-300 mt-0.5 truncate">
                    {turn.totalTokens}
                  </span>
                  <span className="text-[8px] text-slate-400 font-sans mt-0.5">
                    tokens
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 text-center bg-slate-950">
        Google Gemini 3.5 Flash-Lite Token & Size Tracker
      </div>
    </aside>
  );
}
