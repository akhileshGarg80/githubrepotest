/**
 * Utility functions for calculating byte sizes (B, KB, MB) and estimated Gemini token counts.
 */

export function calculateByteSize(text: string): number {
  if (!text) return 0;
  // UTF-8 byte length
  return new TextEncoder().encode(text).length;
}

export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 2 : 1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Accurately estimates Gemini token count for arbitrary text / code / multilingual payloads.
 * Roughly ~3.8 bytes per token across English, code, punctuation, and Unicode.
 */
export function estimateTokens(text: string): number {
  if (!text || !text.trim()) return 0;
  
  const bytes = calculateByteSize(text);
  // Word count and character heuristic for tighter bounds
  const words = text.trim().split(/\s+/).length;
  
  // Gemini tokenization:
  // English words typically average ~1.3 tokens per word.
  // Code / symbols / JSON / multilingual usually take ~3.5 - 4 bytes per token.
  const tokenByBytes = Math.ceil(bytes / 3.8);
  const tokenByWords = Math.ceil(words * 1.3);
  
  // Choose the balanced estimate
  return Math.max(1, Math.max(tokenByBytes, tokenByWords));
}

export function getPayloadAnalytics(text: string) {
  const bytes = calculateByteSize(text);
  const formattedSize = formatByteSize(bytes);
  const estimatedTokenCount = estimateTokens(text);
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    bytes,
    formattedSize,
    tokens: estimatedTokenCount,
    chars: charCount,
    words: wordCount,
  };
}
