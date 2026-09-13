import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, AlertCircle } from 'lucide-react';
import { ChatMessage, FIXED_MODEL } from '../types';
import { formatByteSize, calculateByteSize } from '../utils/tokenCalc';
import { highlightCode, getPrismLanguage } from '../utils/syntaxHighlight';

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const textContent = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy code', e);
    }
  };

  const highlightedHtml = highlightCode(textContent, language || 'javascript');

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[#2d2d2d] bg-[#1e1e1e] shadow-sm code-syntax-viewer">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#181818] border-b border-[#2d2d2d] text-xs font-mono text-slate-400">
        <span className="text-indigo-400 font-semibold">{language || 'code'}</span>
        <button
          id={`copy-code-btn-${Math.random().toString(36).substring(7)}`}
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-200 transition-colors py-0.5 px-2 rounded hover:bg-slate-800 cursor-pointer"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono text-[#d4d4d4] leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0">
          <code
            className={`language-${getPrismLanguage(language)} !bg-transparent`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
}

export function ChatMessageItem({ message, isStreaming }: ChatMessageItemProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy message', e);
    }
  };

  return (
    <div
      id={`chat-msg-${message.id}`}
      className={`py-4 px-4 sm:px-6 transition-colors ${
        isUser ? 'bg-slate-900/40' : 'bg-transparent'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3 sm:gap-4 items-start">
        {/* Avatar */}
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : message.error
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : message.error ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-400">
                {isUser ? 'You' : (message.modelName || FIXED_MODEL.name)}
              </span>
              {isUser ? (
                <div className="inline-flex items-center gap-1">
                  {message.inputTokens ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                      {message.inputTokens} tokens sent
                    </span>
                  ) : null}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {message.formattedSize || formatByteSize(calculateByteSize(message.content))}
                  </span>
                </div>
              ) : message.tokenUsage ? (
                <div className="inline-flex items-center gap-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                    {message.tokenUsage.candidatesTokens} tokens AI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {formatByteSize(calculateByteSize(message.content))}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                id={`copy-msg-btn-${message.id}`}
                onClick={copyMessage}
                className="opacity-60 hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {message.error ? (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm leading-relaxed">
              <p className="font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                Error generating response
              </p>
              <p className="mt-1 text-xs sm:text-sm text-rose-200/90 font-mono whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : isUser ? (
            <p className="text-slate-100 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="text-slate-200 text-sm sm:text-base leading-relaxed space-y-3 prose-invert max-w-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isMultiline = String(children).includes('\n');
                    if (isMultiline) {
                      return <CodeBlock className={className}>{children}</CodeBlock>;
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300 font-mono text-xs sm:text-sm border border-slate-700/50"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>;
                  },
                  h1({ children }) {
                    return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-base font-semibold text-slate-100 mt-2 mb-1">{children}</h3>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-4 border-emerald-500/50 pl-3 my-2 text-slate-400 italic">
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full text-xs sm:text-sm text-left border-collapse border border-slate-700">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="border border-slate-700 bg-slate-800/80 px-3 py-2 font-semibold text-slate-200">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return <td className="border border-slate-700 px-3 py-2 text-slate-300">{children}</td>;
                  },
                }}
              >
                {message.content}
              </Markdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1 align-middle" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
