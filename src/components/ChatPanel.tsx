import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ChevronRight,
  FileCode,
  Layers,
  Plus,
  X,
  Search,
  HardDrive,
  Cpu,
} from 'lucide-react';
import {
  ChatMessage,
  ActiveFile,
  GitHubRepo,
  GitHubTreeItem,
  GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL,
  GeminiModelOption,
} from '../types';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { ChatMessageItem } from './ChatMessageItem';
import { getPayloadAnalytics, formatByteSize } from '../utils/tokenCalc';

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (
    text: string,
    options?: {
      mode?: 'chat' | 'code';
      includeFile?: boolean;
      useMultiFiles?: boolean;
      selectedFilePaths?: string[];
      model?: string;
    }
  ) => void;
  onStopStreaming: () => void;
  hasKeyReady: boolean;
  onOpenApiKeyModal: () => void;
  activeFile: ActiveFile | null;
  onApplyCodeToFile: (code: string, targetPath?: string) => void;
  onDraftChange: (analytics: ReturnType<typeof getPayloadAnalytics> | null) => void;
  isOpen: boolean;
  onToggle: () => void;

  // Multi-File selection props
  treeItems: GitHubTreeItem[];
  selectedChatFilePaths: string[];
  onToggleChatFile: (path: string) => void;
  onClearChatFiles: () => void;
  onSelectAllChatFiles: (paths: string[]) => void;
  isMultiFileMode: boolean;
  onToggleMultiFileMode: () => void;

  // Repository context
  selectedRepo: GitHubRepo | null;

  // Gemini Chat Model selection
  selectedChatModel?: GeminiModelOption;
  onSelectChatModel?: (model: GeminiModelOption) => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  hasKeyReady,
  onOpenApiKeyModal,
  activeFile,
  onApplyCodeToFile,
  onDraftChange,
  isOpen,
  onToggle,
  treeItems,
  selectedChatFilePaths,
  onToggleChatFile,
  onClearChatFiles,
  onSelectAllChatFiles,
  isMultiFileMode,
  onToggleMultiFileMode,
  selectedRepo,
  selectedChatModel,
  onSelectChatModel,
}: ChatPanelProps) {
  const [chatMode, setChatMode] = useState<'chat' | 'code'>('chat');
  const [attachFileContext, setAttachFileContext] = useState<boolean>(true);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [localChatModel, setLocalChatModel] = useState<GeminiModelOption>(DEFAULT_GEMINI_MODEL);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChatModel = selectedChatModel || localChatModel;

  const handleChooseChatModel = (model: GeminiModelOption) => {
    setLocalChatModel(model);
    onSelectChatModel?.(model);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Filter repository files for the picker dialog
  const repoFilesOnly = useMemo(() => {
    return treeItems.filter((item) => item.type === 'blob');
  }, [treeItems]);

  const filteredPickerFiles = useMemo(() => {
    if (!pickerSearch.trim()) return repoFilesOnly;
    const q = pickerSearch.toLowerCase();
    return repoFilesOnly.filter((f) => f.path.toLowerCase().includes(q));
  }, [repoFilesOnly, pickerSearch]);

  // Calculate estimated tokens for selected files
  const estimatedAttachedTokens = useMemo(() => {
    const totalBytes = selectedChatFilePaths.reduce((acc, path) => {
      const item = treeItems.find((t) => t.path === path);
      return acc + (item?.size || 1000);
    }, 0);
    return Math.round(totalBytes / 4);
  }, [selectedChatFilePaths, treeItems]);

  const handleSend = (text: string) => {
    onSendMessage(text, {
      mode: chatMode,
      includeFile: !isMultiFileMode && attachFileContext && Boolean(activeFile),
      useMultiFiles: isMultiFileMode && selectedChatFilePaths.length > 0,
      selectedFilePaths: selectedChatFilePaths,
      model: activeChatModel.id,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      id="gemini-chat-panel"
      className="w-full sm:w-[480px] md:w-[540px] lg:w-[600px] xl:w-[680px] shrink-0 bg-slate-950 flex flex-col h-full overflow-hidden border-l border-slate-800/80 relative z-20"
    >
      {/* Panel Top Header: Dedicated Clean Chat */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>Gemini AI Chat</span>
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {selectedRepo ? selectedRepo.full_name : 'Codebase & Multi-File Assistant'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer shrink-0"
            title="Collapse Chat Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Chat sub-controls */}
        <div className="p-2 border-b border-slate-800/60 bg-slate-900/40 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {/* Mode toggle */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChatMode('chat')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  chatMode === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Chat Q&A
              </button>
              <button
                type="button"
                onClick={() => setChatMode('code')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  chatMode === 'code'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Code Studio
              </button>
            </div>

            {/* Gemini Model Selector for Chat */}
            <div
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 shadow-xs"
              title="Select Gemini Model"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                id="chat-model-dropdown-top"
                value={activeChatModel.id}
                onChange={(e) => {
                  const found = GEMINI_MODELS.find((m) => m.id === e.target.value) || DEFAULT_GEMINI_MODEL;
                  handleChooseChatModel(found);
                }}
                className="bg-transparent text-amber-300 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200 font-sans">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Context Mode Switch: Single File vs Multi-File */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Multi-File Mode Toggle Switch */}
              <button
                id="toggle-multi-file-chat-btn"
                type="button"
                onClick={onToggleMultiFileMode}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isMultiFileMode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title={
                  isMultiFileMode
                    ? 'Multi-File context is active. Click to switch to single file.'
                    : 'Turn ON to select multiple files for chat.'
                }
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-File</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    selectedChatFilePaths.length > 0
                      ? isMultiFileMode
                        ? 'bg-emerald-800 text-white'
                        : 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {selectedChatFilePaths.length}
                </span>
              </button>

              {/* If in Multi-File mode: "+ Pick Files" button */}
              {isMultiFileMode && (
                <button
                  id="open-file-picker-btn"
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Select files from repo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Files</span>
                </button>
              )}

              {/* If NOT in multi-file mode: show active file attach toggle */}
              {!isMultiFileMode && activeFile && (
                <button
                  type="button"
                  onClick={() => setAttachFileContext(!attachFileContext)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    attachFileContext
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                  title={attachFileContext ? 'Active file attached' : 'Click to attach active file'}
                >
                  <FileCode className="w-3 h-3 text-blue-400" />
                  <span className="truncate max-w-[100px]">{activeFile.name}</span>
                  <span>{attachFileContext ? '✓' : '+'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Multi-File Attached Chips Bar */}
          {isMultiFileMode && (
            <div className="pt-1.5 border-t border-slate-800/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  <span>
                    Attached Files ({selectedChatFilePaths.length}):
                  </span>
                  {selectedChatFilePaths.length > 0 && (
                    <span className="text-emerald-400 font-mono text-[10px]">
                      ~{estimatedAttachedTokens.toLocaleString()} tokens
                    </span>
                  )}
                </span>

                {selectedChatFilePaths.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearChatFiles}
                    className="text-slate-400 hover:text-rose-400 text-[10px] cursor-pointer underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {selectedChatFilePaths.length === 0 ? (
                <div className="p-2 rounded-lg bg-slate-900/60 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>No files attached yet. Choose files to chat with multiple files together.</span>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="text-indigo-400 hover:text-indigo-300 font-medium underline ml-2 cursor-pointer shrink-0"
                  >
                    Choose files
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {selectedChatFilePaths.map((path) => {
                    const fileName = path.split('/').pop() || path;
                    return (
                      <span
                        key={path}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-[11px] font-mono group"
                      >
                        <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[140px]" title={path}>
                          {fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleChatFile(path)}
                          className="text-emerald-400/80 hover:text-rose-300 ml-0.5 cursor-pointer"
                          title={`Remove ${fileName}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick File Selector Modal / Drawer for Chat Context */}
        {isPickerOpen && (
          <div
            id="file-picker-modal"
            className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col p-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Attach Files for AI Chat</h4>
                  <p className="text-[10px] text-slate-400">
                    Select multiple files to analyze logic across files in one chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Bulk Select Controls */}
            <div className="py-2 space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search repository files..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-400">
                  Showing {filteredPickerFiles.length} of {repoFilesOnly.length} files
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allPaths = filteredPickerFiles.map((f) => f.path);
                      onSelectAllChatFiles(allPaths);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Select all visible
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={onClearChatFiles}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* File Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-900 rounded-lg border border-slate-800/80 bg-slate-900/40 p-1">
              {filteredPickerFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No files matching "{pickerSearch}"
                </div>
              ) : (
                filteredPickerFiles.map((file) => {
                  const isSelected = selectedChatFilePaths.includes(file.path);
                  return (
                    <div
                      key={file.path}
                      onClick={() => onToggleChatFile(file.path)}
                      className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/50'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleChatFile(file.path)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                        />
                        <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-xs font-mono truncate">{file.path}</span>
                      </div>
                      {typeof file.size === 'number' && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {formatByteSize(file.size)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Done Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between mt-2">
              <div className="text-xs text-slate-300">
                <strong className="text-emerald-400">{selectedChatFilePaths.length}</strong> files selected
                {selectedChatFilePaths.length > 0 && (
                  <span className="text-slate-500 ml-1">
                    (~{estimatedAttachedTokens.toLocaleString()} tokens)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <EmptyState
              onSelectPrompt={(p) => handleSend(p)}
              hasCustomKey={hasKeyReady}
              onOpenApiKeyModal={onOpenApiKeyModal}
            />
          ) : (
            messages.map((msg, index) => (
              <ChatMessageItem
                key={msg.id || index}
                message={msg}
                isStreaming={isStreaming && index === messages.length - 1}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Box */}
        <ChatInput
          onSendMessage={handleSend}
          isStreaming={isStreaming}
          onStopStreaming={onStopStreaming}
          hasKeyReady={hasKeyReady}
          onOpenApiKeyModal={onOpenApiKeyModal}
          selectedModel={activeChatModel}
          onSelectModel={handleChooseChatModel}
          selectedModelName={activeChatModel.name}
          onDraftChange={onDraftChange}
        />
      </div>
    </div>
  );
}
