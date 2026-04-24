import type { Node } from 'ts-morph';

/***
 * Reads the nearest Paradox doc comment attached to a declaration.
 */
export function getParadoxComment(node: Node): string | null {
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText();
  const nodeStart = node.getStart(false);
  const beforeNode = text.slice(0, nodeStart);
  const commentStart = beforeNode.lastIndexOf('/***');

  if (commentStart === -1) return null;

  const commentEnd = text.indexOf('*/', commentStart);

  if (commentEnd === -1 || commentEnd > nodeStart) return null;

  const between = text.slice(commentEnd + 2, nodeStart);

  if (!/^[\s;]*(export\s+)?(default\s+)?$/.test(between)) return null;

  return text.slice(commentStart, commentEnd + 2);
}
