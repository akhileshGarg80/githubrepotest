import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  File,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  GitBranch,
  ShieldAlert,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { GitHubTreeItem, GitHubRepo, ActiveFile } from '../types';
import { formatByteSize } from '../utils/tokenCalc';
import { isPathIgnored } from '../utils/gitignore';

interface FileTreeSidebarProps {
  repo: GitHubRepo | null;
  treeItems: GitHubTreeItem[];
  branch: string;
  activeFile: ActiveFile | null;
  onSelectFile: (path: string) => void;
  onTriggerDeepScan?: () => void;
  isScanning?: boolean;
  gitignorePatterns: string[];
  isLoadingTree: boolean;
  isOpen: boolean;
  onToggle: () => void;
  selectedChatFilePaths?: string[];
  onToggleChatFile?: (path: string) => void;
  isMultiSelectMode?: boolean;
  onToggleMultiSelectMode?: () => void;
  onClearChatFiles?: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  ignored?: boolean;
  children: Record<string, TreeNode>;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
    return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
  if (['py', 'rb', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext)) {
    return <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
    return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  if (['md', 'txt', 'markdown', 'rst'].includes(ext)) {
    return <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  }
  if (['html', 'css', 'scss', 'svg'].includes(ext)) {
    return <FileCode className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  }
  return <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

export function FileTreeSidebar({
  repo,
  treeItems,
  branch,
  activeFile,
  onSelectFile,
  onTriggerDeepScan,
  isScanning,
  gitignorePatterns,
  isLoadingTree,
  isOpen,
  onToggle,
  selectedChatFilePaths = [],
  onToggleChatFile,
  isMultiSelectMode = false,
  onToggleMultiSelectMode,
  onClearChatFiles,
}: FileTreeSidebarProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [hideIgnored, setHideIgnored] = useState(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ '': true });

  // Build filtered items and calculate ignored count
  const { visibleItems, ignoredCount, totalCount } = useMemo(() => {
    let ignored = 0;
    const itemsWithIgnored = treeItems.map((item) => {
      const isIgnored = isPathIgnored(item.path, gitignorePatterns);
      if (isIgnored) ignored++;
      return { ...item, ignored: isIgnored };
    });

    const filtered = itemsWithIgnored.filter((item) => {
      if (hideIgnored && item.ignored) return false;
      if (filterQuery) {
        return item.path.toLowerCase().includes(filterQuery.toLowerCase());
      }
      return true;
    });

    return {
      visibleItems: filtered,
      ignoredCount: ignored,
      totalCount: treeItems.length,
    };
  }, [treeItems, gitignorePatterns, hideIgnored, filterQuery]);

  // Build hierarchical tree structure
  const rootNode = useMemo(() => {
    const root: TreeNode = {
      name: '',
      path: '',
      type: 'tree',
      children: {},
    };

    visibleItems.forEach((item) => {
      const parts = item.path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLeaf = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            type: isLeaf ? item.type : 'tree',
            size: isLeaf ? item.size : undefined,
            ignored: item.ignored,
            children: {},
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }, [visibleItems]);

  const toggleFolder = (folderPath: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const renderTree = (node: TreeNode, level = 0) => {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const childA = node.children[a];
      const childB = node.children[b];
      // Directories first, then files
      if (childA.type !== childB.type) {
        return childA.type === 'tree' ? -1 : 1;
      }
      return childA.name.localeCompare(childB.name);
    });

    return (
      <div className="space-y-0.5">
        {sortedKeys.map((key) => {
          const child = node.children[key];
          const isDir = child.type === 'tree';
          const isOpenFolder = Boolean(openFolders[child.path]);
          const isSelected = activeFile?.path === child.path;

          if (isDir) {
            return (
              <div key={child.path} className="select-none">
                <button
                  type="button"
                  onClick={() => toggleFolder(child.path)}
                  style={{ paddingLeft: `${Math.max(6, level * 12 + 6)}px` }}
                  className="w-full text-left py-1 pr-2 rounded-md hover:bg-slate-900 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors cursor-pointer group"
                >
                  {isOpenFolder ? (
                    <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                  )}
                  {isOpenFolder ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate font-medium">{child.name}</span>
                </button>

                {isOpenFolder && renderTree(child, level + 1)}
              </div>
            );
          }

          const isChatSelected = Boolean(selectedChatFilePaths.includes(child.path));

          return (
            <div
              key={child.path}
              id={`file-node-${child.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
              style={{ paddingLeft: `${Math.max(8, level * 12 + 8)}px` }}
              className={`w-full py-1 pr-2 rounded-md flex items-center gap-1.5 text-xs transition-colors ${
                isChatSelected
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-700/60 font-medium'
                  : isSelected
                  ? 'bg-blue-600/20 text-blue-300 font-semibold border-l-2 border-blue-500'
                  : child.ignored
                  ? 'text-slate-500 hover:bg-slate-900 hover:text-slate-400 italic'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {isMultiSelectMode && (
                <input
                  type="checkbox"
                  checked={isChatSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleChatFile?.(child.path);
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer shrink-0 accent-emerald-500 ml-1"
                  title="Toggle file for AI context"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (isMultiSelectMode && onToggleChatFile) {
                    onToggleChatFile(child.path);
                  } else {
                    onSelectFile(child.path);
                  }
                }}
                className="flex-1 flex items-center justify-between min-w-0 bg-transparent text-left cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {getFileIcon(child.name)}
                  <span className="truncate">{child.name}</span>
                </div>
                {typeof child.size === 'number' && (
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                    {formatByteSize(child.size)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      id="repo-files-sidebar"
      className="w-56 sm:w-60 md:w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/90 flex flex-col h-full overflow-hidden relative z-10"
    >
      {/* Top Header */}
      <div className="p-2.5 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-100 uppercase tracking-wider truncate">
              {repo ? repo.name : 'Files & Folders'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer shrink-0"
            title="Hide files panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {repo && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1.5">
            <GitBranch className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="font-mono text-slate-300 truncate">{branch || repo.default_branch}</span>
            <span className="text-slate-600">•</span>
            <span className="shrink-0">{visibleItems.length} files</span>
          </div>
        )}

        {/* Multi-File AI Context Mode Switch */}
        {repo && (
          <div className="pt-1.5 border-t border-slate-800/80">
            <button
              id="multi-file-sidebar-toggle-btn"
              type="button"
              onClick={onToggleMultiSelectMode}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isMultiSelectMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
              title="Toggle multi-file selection to attach multiple files to AI Chat"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Multi-File AI Mode</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                  selectedChatFilePaths.length > 0
                    ? isMultiSelectMode
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {selectedChatFilePaths.length}
              </span>
            </button>

            {isMultiSelectMode && selectedChatFilePaths.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1.5 px-0.5">
                <span>{selectedChatFilePaths.length} files attached for AI</span>
                <button
                  type="button"
                  onClick={onClearChatFiles}
                  className="text-slate-400 hover:text-rose-400 text-[10px] cursor-pointer underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & .gitignore Filter Bar */}
      <div className="p-1.5 border-b border-slate-800/60 bg-slate-900/30 space-y-1">
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-6 pr-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
          />
        </div>

        {/* .gitignore Filter Toggle */}
        <div className="flex items-center justify-between text-[10px] px-1">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>.gitignore</span>
          </span>
          <button
            type="button"
            onClick={() => setHideIgnored(!hideIgnored)}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              hideIgnored
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title={hideIgnored ? 'Ignored files are hidden' : 'Ignored files are shown'}
          >
            {hideIgnored ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
            <span>{hideIgnored ? `(${ignoredCount})` : 'All'}</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoadingTree ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400" />
            <p>Loading files tree...</p>
          </div>
        ) : !repo ? (
          <div className="py-12 text-center px-4">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Koi repo select nahi hai</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Left sidebar se repository select karein uske file-folders dekhne ke liye.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {filterQuery ? `No files matching "${filterQuery}"` : 'Repository is empty'}
          </div>
        ) : (
          renderTree(rootNode)
        )}
      </div>

      {/* Tree Footer */}
      <div className="p-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between bg-slate-950">
        <span>{totalCount} total files</span>
        {ignoredCount > 0 && <span>{ignoredCount} in .gitignore</span>}
      </div>
    </div>
  );
}
