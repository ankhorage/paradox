/***
 * Parsed representation of a Paradox doc comment.
 */
export interface ParsedParadoxComment {
  description: string | null;
}

/***
 * Parses a Paradox doc comment into structured metadata.
 */
export function parseParadoxComment(rawComment: string): ParsedParadoxComment {
  const body = rawComment
    .replace(/^\/\*\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd())
    .join('\n')
    .trim();

  return {
    description: body.length > 0 ? body : null,
  };
}
