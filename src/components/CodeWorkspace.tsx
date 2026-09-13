import React, { useState, useMemo, useRef } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Save,
  Play,
  Sparkles,
  Edit3,
  Eye,
  AlignLeft,
  AlignCenter,
  WrapText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActiveFile, CenterTab } from '../types';
import { formatByteSize } from '../utils/tokenCalc';
import { highlightCodeLines } from '../utils/syntaxHighlight';

interface CodeWorkspaceProps {
  activeFile: ActiveFile | null;
  onChangeFileContent: (content: string) => void;
  onSaveFile: () => void;
  onAskGeminiAboutFile: (prompt: string) => void;
  activeCenterTab: CenterTab;
  onChangeCenterTab: (tab: CenterTab) => void;
  onOpenFileInEditor?: (filePath: string) => void;
}

export function CodeWorkspace({
  activeFile,
  onChangeFileContent,
  onSaveFile,
  onAskGeminiAboutFile,
  activeCenterTab,
  onChangeCenterTab,
}: CodeWorkspaceProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeDisplayMode, setCodeDisplayMode] = useState<'syntax' | 'edit'>('syntax');
  const [askPrompt, setAskPrompt] = useState('');
  const [isCenteredLayout, setIsCenteredLayout] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineGutterRef = useRef<HTMLDivElement | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Syntax highlighted lines array
  const highlightedLines = useMemo(() => {
    if (!activeFile || !activeFile.content) return [];
    return highlightCodeLines(activeFile.content, activeFile.name || activeFile.language);
  }, [activeFile?.content, activeFile?.name, activeFile?.language]);

  const rawLines = useMemo(() => {
    if (!activeFile?.content) return [];
    return activeFile.content.split('\n');
  }, [activeFile?.content]);

  const totalLines = rawLines.length;
  // Calculate gutter width based on line count digits
  const gutterWidthClass = totalLines >= 1000 ? 'w-16' : totalLines >= 100 ? 'w-12' : 'w-10';

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askPrompt.trim() || !activeFile) return;
    onAskGeminiAboutFile(`Regarding file "${activeFile.path}": ${askPrompt}`);
    setAskPrompt('');
  };

  // Handle Tab key in Edit mode for clean 2-space indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + '  ' + val.substring(end);
      onChangeFileContent(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div
      id="code-center-workspace"
      className="flex-1 flex flex-col min-w-0 bg-slate-950 h-full overflow-hidden border-r border-slate-800/80"
    >
      {/* Top Workspace Tab Bar */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800/80 bg-slate-900/70 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Code Editor Tab */}
          <button
            id="tab-code-editor"
            type="button"
            onClick={() => onChangeCenterTab('code')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeCenterTab === 'code'
                ? 'border-blue-500 text-blue-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{activeFile ? activeFile.name : 'Code Editor'}</span>
            {activeFile?.isModified && (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" title="Unsaved changes"></span>
            )}
          </button>

          {/* Live Preview Tab */}
          <button
            id="tab-preview"
            type="button"
            onClick={() => onChangeCenterTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeCenterTab === 'preview'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 py-1">
          {activeFile && activeCenterTab === 'code' && (
            <>
              {/* Centered / Full-Width Reading Layout Toggle */}
              <button
                type="button"
                onClick={() => setIsCenteredLayout(!isCenteredLayout)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isCenteredLayout
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={
                  isCenteredLayout
                    ? 'Centered Readability Layout (Active) - click for full width'
                    : 'Full Width (Active) - click to center code with reading margins'
                }
              >
                {isCenteredLayout ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
              </button>

              {/* Line Wrap Toggle */}
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  wrapLines
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={wrapLines ? 'Line Wrap (Enabled)' : 'Line Wrap (Disabled) - scroll horizontally'}
              >
                <WrapText className="w-3.5 h-3.5" />
              </button>

              {/* Switcher: Colorful Syntax View vs Edit Mode */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => setCodeDisplayMode('syntax')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    codeDisplayMode === 'syntax'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Line-by-line Colorful Syntax Highlighting"
                >
                  <Eye className="w-3 h-3" />
                  <span>Colorful View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeDisplayMode('edit')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    codeDisplayMode === 'edit'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Interactive Code Editor"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Mode</span>
                </button>
              </div>

              {activeFile.isModified && (
                <button
                  type="button"
                  onClick={onSaveFile}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors shadow-xs cursor-pointer ml-1"
                  title="Save local changes"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopy(activeFile.content)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleDownload(activeFile.name, activeFile.content)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Tab 1: Code View / Edit */}
        {activeCenterTab === 'code' && (
          activeFile ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
              {/* File Info Bar */}
              <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-200 font-semibold truncate">{activeFile.path}</span>
                  <span className="text-slate-500">•</span>
                  <span>{activeFile.language}</span>
                  <span className="text-slate-500">•</span>
                  <span>{totalLines} lines</span>
                  <span className="text-slate-500">•</span>
                  <span>{formatByteSize(activeFile.size || activeFile.content.length)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isCenteredLayout && (
                    <span className="text-indigo-400 font-sans text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      Reading Mode
                    </span>
                  )}
                  {activeFile.isModified && (
                    <span className="text-amber-400 font-sans font-medium text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      Modified Locally
                    </span>
                  )}
                </div>
              </div>

              {/* Line-by-Line Code Content Area */}
              <div className="flex-1 overflow-auto bg-slate-950">
                <div
                  className={`min-h-full transition-all duration-200 ${
                    isCenteredLayout
                      ? 'max-w-5xl mx-auto my-3 border border-slate-800/80 rounded-xl shadow-2xl bg-slate-950/95 overflow-hidden'
                      : 'w-full'
                  }`}
                >
                  {codeDisplayMode === 'syntax' ? (
                    /* Line-by-line syntax highlight viewer */
                    <div className="py-2 text-[13px] font-mono leading-6">
                      {highlightedLines.map((lineHtml, idx) => {
                        const lineNum = idx + 1;
                        return (
                          <div
                            key={lineNum}
                            className="code-line-row hover:bg-slate-900/70 select-text flex group"
                          >
                            {/* Left Gutter: Line Number */}
                            <span
                              className={`code-line-number text-slate-600 group-hover:text-slate-400 select-none ${gutterWidthClass}`}
                            >
                              {lineNum}
                            </span>
                            {/* Line Content */}
                            <span
                              className={`code-line-content ${wrapLines ? 'wrap-enabled' : ''}`}
                              dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Interactive Line-by-Line Code Editor */
                    <div className="flex h-full min-h-[500px]">
                      {/* Synchronized Line Numbers Gutter */}
                      <div
                        ref={lineGutterRef}
                        className={`py-3 bg-slate-950 border-r border-slate-800/70 select-none text-right font-mono text-[13px] leading-6 text-slate-600 shrink-0 overflow-hidden ${gutterWidthClass}`}
                      >
                        {rawLines.map((_, i) => (
                          <div key={i + 1} className="pr-3 pl-1">
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        ref={textareaRef}
                        value={activeFile.content}
                        onChange={(e) => onChangeFileContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onScroll={handleTextareaScroll}
                        className={`flex-1 p-3 bg-transparent text-slate-100 font-mono text-[13px] leading-6 resize-none focus:outline-none border-0 selection:bg-blue-600 selection:text-white ${
                          wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                        }`}
                        placeholder="Type or paste code here..."
                        spellCheck={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Ask Gemini About File Assistant Bar */}
              <form
                onSubmit={handleAskSubmit}
                className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 shrink-0"
              >
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Ask Gemini:</span>
                </div>
                <input
                  type="text"
                  placeholder={`Ask questions, request changes or refactor for ${activeFile.name}...`}
                  value={askPrompt}
                  onChange={(e) => setAskPrompt(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!askPrompt.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Send to Chat
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <FileCode className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">No File Selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Select any file from the repository tree on the left to view colorful syntax highlighting, edit code line by line, and chat with Gemini.
                </p>
              </div>
            </div>
          )
        )}

        {/* Tab 2: Live Preview */}
        {activeCenterTab === 'preview' && (
          <div className="flex-1 overflow-auto bg-slate-950 p-4">
            {activeFile?.name.endsWith('.md') || activeFile?.name.endsWith('.markdown') ? (
              <div className="max-w-4xl mx-auto markdown-body text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeFile.content}
                </ReactMarkdown>
              </div>
            ) : activeFile?.name.endsWith('.html') || activeFile?.name.endsWith('.svg') ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <iframe
                  srcDoc={activeFile.content}
                  className="w-full h-full bg-white rounded-lg border border-slate-800"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <Play className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-medium">Code Preview Mode</p>
                <p className="text-xs text-slate-500 max-w-md">
                  Select a Markdown (.md) or HTML (.html) file to preview its rendered layout here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
