import { type ParsedParadoxComment, parseParadoxComment } from './parseParadoxComment.js';

export interface LeadingParadoxComment {
  parsed: ParsedParadoxComment;
  start: number;
  end: number;
}

/***
 * Parses a leading Paradox comment from a source file.
 */
export function getLeadingParadoxComment(source: string): LeadingParadoxComment | null {
  const match = /^\s*(\/\*\*\*[\s\S]*?\*\/)/.exec(source);
  const comment = match?.[1];
  if (match === null || comment === undefined) return null;

  const start = match[0].indexOf(comment);

  return {
    parsed: parseParadoxComment(comment),
    start,
    end: start + comment.length,
  };
}
