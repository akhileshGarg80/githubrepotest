import { FileAnalysisDoc } from '../types';

/**
 * Perform rapid static AST/heuristic analysis of a source code file.
 * Extracts purpose, exports, dependencies, line count, and formats rich Markdown documentation.
 */
export function analyzeSourceFileLocally(
  filePath: string,
  content: string,
  size?: number
): FileAnalysisDoc {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const name = filePath.split('/').pop() || filePath;

  const lines = content.split('\n');
  const lineCount = lines.length;

  // 1. Extract imports / dependencies
  const dependencies = new Set<string>();
  const importRegex = /(?:import|require)\s*(?:[\w\s{},*]+from\s*)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1] && !match[1].startsWith('.')) {
      const depName = match[1].split('/')[0].replace(/^@/, (at) => at + match![1].split('/')[1]);
      dependencies.add(depName || match[1]);
    }
  }

  // 2. Extract exports & declarations (functions, components, classes, types, interfaces, routes)
  const keyExports: string[] = [];
  const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z0-9_$]+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1] && !keyExports.includes(match[1])) {
      keyExports.push(match[1]);
    }
  }

  // Also look for Express route handlers (app.get, router.post, etc.)
  const routeRegex = /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]/g;
  const discoveredRoutes: Array<{ method: string; path: string }> = [];
  while ((match = routeRegex.exec(content)) !== null) {
    discoveredRoutes.push({ method: match[1].toUpperCase(), path: match[2] });
  }

  // 3. Determine Purpose & Summary based on path and extracted content
  let purpose = '';
  let summary = '';

  const lowerPath = filePath.toLowerCase();
  if (lowerPath === 'package.json') {
    purpose = 'Node.js manifest defining project metadata, dependencies, and build scripts.';
    summary = 'Declares all runtime and development packages, npm scripts (dev, build, start), and project configuration.';
  } else if (lowerPath.includes('readme')) {
    purpose = 'Primary project documentation, onboarding instructions, and repository guide.';
    summary = 'Contains project overview, setup commands, and architectural notes for developers.';
  } else if (lowerPath.includes('server') || lowerPath.endsWith('.server.ts') || lowerPath.endsWith('.server.js')) {
    purpose = 'Backend server entry point handling API routes, middleware, and request dispatching.';
    summary = `Hosts Express server listening on designated port with ${discoveredRoutes.length} route handlers and service connections.`;
  } else if (lowerPath.includes('api/') || lowerPath.includes('routes/')) {
    purpose = 'API route definitions and request/response controller handlers.';
    summary = `Manages endpoint logic for ${discoveredRoutes.map(r => `${r.method} ${r.path}`).join(', ') || 'API services'}.`;
  } else if (lowerPath.includes('component') || ext === 'tsx' || ext === 'jsx') {
    purpose = `React UI component responsible for rendering ${name.replace(/\.[^/.]+$/, '')} visual elements and interactions.`;
    summary = `Implements user interface state, event handlers, and responsive Tailwind styling for ${keyExports.join(', ') || name}.`;
  } else if (lowerPath.includes('service') || lowerPath.includes('client')) {
    purpose = 'Service layer abstraction handling external API communication and business logic.';
    summary = `Provides client functions (${keyExports.slice(0, 4).join(', ') || 'service calls'}) with error handling and data parsing.`;
  } else if (lowerPath.includes('type') || lowerPath.includes('model') || lowerPath.endsWith('.d.ts')) {
    purpose = 'Type definitions, interfaces, and shared data schemas.';
    summary = `Defines TypeScript types and data structures (${keyExports.slice(0, 5).join(', ') || 'global models'}) for type safety.`;
  } else if (lowerPath.includes('config') || lowerPath.includes('vite') || lowerPath.includes('tailwind')) {
    purpose = 'Tooling and bundler configuration file for the build pipeline.';
    summary = `Specifies build plugins, optimization settings, and compiler options for ${name}.`;
  } else {
    purpose = `Core source file executing ${name.replace(/\.[^/.]+$/, '')} functionality in the application.`;
    summary = `Contains ${lineCount} lines of ${ext.toUpperCase() || 'source'} code implementing ${keyExports.join(', ') || 'module internals'}.`;
  }

  // 4. Generate pristine Markdown document
  const mdParts: string[] = [
    `# 📄 \`${filePath}\``,
    `\n---\n`,
    `## 📌 Purpose (Kam kya hai)`,
    purpose,
    `\n## 🔍 What is Inside (Kya kya code hai)`,
    summary,
    `\n- **File Name**: \`${name}\``,
    `- **File Path**: \`${filePath}\``,
    `- **Language / Type**: \`.${ext}\` (${lineCount} lines)`,
    size ? `- **Size**: ${size} bytes` : '',
  ];

  if (keyExports.length > 0) {
    mdParts.push(`\n## ⚙️ Key Exports & Declarations`);
    keyExports.forEach((exp) => {
      mdParts.push(`- \`${exp}\``);
    });
  }

  if (discoveredRoutes.length > 0) {
    mdParts.push(`\n## 🔌 Endpoints / Routes in this file`);
    discoveredRoutes.forEach((r) => {
      mdParts.push(`- **\`${r.method}\`** \`${r.path}\``);
    });
  }

  if (dependencies.size > 0) {
    mdParts.push(`\n## 🔗 Key Dependencies`);
    Array.from(dependencies).forEach((dep) => {
      mdParts.push(`- \`${dep}\``);
    });
  }

  return {
    path: filePath,
    name,
    language: ext,
    size,
    status: 'completed',
    purpose,
    summary,
    keyExports,
    dependencies: Array.from(dependencies),
    mdContent: mdParts.filter(Boolean).join('\n'),
    analyzedAt: Date.now(),
  };
}
