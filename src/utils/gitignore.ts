/**
 * Simple, robust .gitignore parser and matcher.
 */

export function parseGitignore(content: string): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export function isPathIgnored(path: string, patterns: string[]): boolean {
  if (!path) return false;
  
  // Always ignore .git directory internals
  if (path === '.git' || path.startsWith('.git/')) return true;

  const normalized = path.replace(/^\/+/, '');
  const segments = normalized.split('/');

  for (const rawPattern of patterns) {
    let pattern = rawPattern.trim();
    if (!pattern || pattern.startsWith('#')) continue;

    // Remove trailing slash for directory check
    const isDirOnly = pattern.endsWith('/');
    if (isDirOnly) {
      pattern = pattern.slice(0, -1);
    }

    // Direct match against any segment or full path
    if (pattern.includes('/')) {
      // Relative path pattern
      const cleanPattern = pattern.replace(/^\//, '');
      if (normalized === cleanPattern || normalized.startsWith(cleanPattern + '/')) {
        return true;
      }
    } else {
      // Glob or name match against segment
      for (const segment of segments) {
        if (matchWildcard(segment, pattern)) {
          return true;
        }
      }
    }
  }

  return false;
}

function matchWildcard(str: string, rule: string): boolean {
  if (rule === str) return true;
  if (rule === '*') return true;
  
  // Escape regex special chars except * and ?
  const regexPattern = '^' + rule
    .replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.') + '$';

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(str);
  } catch {
    return str.includes(rule);
  }
}
