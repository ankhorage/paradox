/***
 * Parsed representation of a Paradox doc comment.
 */
interface ParsedParadoxComment {
  description: string | null;
  isConfig: boolean;
  params: Record<string, string>;
  returns: string | null;
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
  const params: Record<string, string> = {};
  let returns: string | null = null;

  const description = lines
    .filter((line) => {
      const trimmed = line.trimStart();

      if (trimmed.startsWith('@config')) {
        isConfig = true;
        return false;
      }

      if (trimmed.startsWith('@param ')) {
        const paramBody = trimmed.slice('@param '.length).trim();
        const [name, ...descriptionParts] = paramBody.split(/\s+/);
        if (name) {
          params[name] = descriptionParts.join(' ').trim();
        }
        return false;
      }

      if (trimmed.startsWith('@returns') || trimmed.startsWith('@return')) {
        const returnBody = trimmed.replace(/^@returns?/, '').trim();
        returns = returnBody.length > 0 ? returnBody : null;
        return false;
      }

      return true;
    })
    .join('\n')
    .trim();

  return {
    description: description.length > 0 ? description : null,
    isConfig,
    params,
    returns,
  };
}
