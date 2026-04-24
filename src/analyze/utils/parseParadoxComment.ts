/***
 * Parsed representation of a Paradox doc comment.
 */
interface ParsedParadoxComment {
  description: string | null;
  isConfig: boolean;
}

/***
 * Parses a Paradox doc comment into structured metadata.
 */
export function parseParadoxComment(rawComment: string): ParsedParadoxComment {
  const lines = rawComment
    .replace(/^\/\*\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());

  let isConfig = false;

  const description = lines
    .filter((line) => {
      if (line.trimStart().startsWith('@config')) {
        isConfig = true;
        return false;
      }

      return true;
    })
    .join('\n')
    .trim();

  return {
    description: description.length > 0 ? description : null,
    isConfig,
  };
}
