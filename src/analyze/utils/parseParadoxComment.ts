/***
 * Parsed representation of a Paradox doc comment.
 */
interface ParsedParadoxComment {
  description: string | null;
  isConfig: boolean;
  isReadme: boolean;
  examples: ParsedExample[];
  params: Record<string, string>;
  returns: string | null;
}

interface ParsedExample {
  title: string | null;
  language: string | null;
  code: string;
}

/***
 * Parses a Paradox doc comment into structured metadata.
 */
export function parseParadoxComment(rawComment: string): ParsedParadoxComment {
  const lines = normalizeCommentLines(rawComment);
  const descriptionLines: string[] = [];
  const examples: ParsedExample[] = [];
  let isConfig = false;
  let isReadme = false;
  const params: Record<string, string> = {};
  let returns: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trimStart();

    if (trimmed.startsWith('@config')) {
      isConfig = true;
      continue;
    }

    if (trimmed.startsWith('@readme')) {
      isReadme = true;
      continue;
    }

    if (trimmed.startsWith('@example')) {
      const parsed = parseExample(lines, index);
      examples.push(parsed.example);
      index = parsed.nextIndex;
      continue;
    }

    if (trimmed.startsWith('@param ')) {
      const paramBody = trimmed.slice('@param '.length).trim();
      const [name, ...descriptionParts] = paramBody.split(/\s+/);
      if (name) {
        params[name] = descriptionParts.join(' ').trim();
      }
      continue;
    }

    if (trimmed.startsWith('@returns') || trimmed.startsWith('@return')) {
      const returnBody = trimmed.replace(/^@returns?/, '').trim();
      returns = returnBody.length > 0 ? returnBody : null;
      continue;
    }

    descriptionLines.push(line);
  }

  const description = descriptionLines.join('\n').trim();

  return {
    description: description.length > 0 ? description : null,
    isConfig,
    isReadme,
    examples,
    params,
    returns,
  };
}

function parseExample(
  lines: readonly string[],
  startIndex: number,
): { example: ParsedExample; nextIndex: number } {
  const header = lines[startIndex]?.trimStart() ?? '';
  const title = header.slice('@example'.length).trim();
  let language: string | null = null;
  const codeLines: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length && (lines[index] ?? '').trim() === '') {
    index += 1;
  }

  const firstCodeLine = lines[index]?.trim() ?? '';
  if (firstCodeLine.startsWith('```')) {
    language = firstCodeLine.slice('```'.length).trim() || null;
    index += 1;

    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (current.trim() === '```') break;
      codeLines.push(current);
      index += 1;
    }
  }

  return {
    example: {
      title: title.length > 0 ? title : null,
      language,
      code: codeLines.join('\n').trimEnd(),
    },
    nextIndex: index,
  };
}

function normalizeCommentLines(rawComment: string): string[] {
  return rawComment
    .replace(/^\/\*\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());
}
