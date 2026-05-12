import { Node, type Node as MorphNode } from 'ts-morph';

/***
 * Reads the nearest Paradox doc comment attached to a declaration.
 */
export function getParadoxComment(node: MorphNode | undefined): string | null {
  if (!node) return null;

  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText();

  for (const nodeStart of getCommentTargetStarts(node)) {
    const comment = readCommentBefore(text, nodeStart);
    if (comment !== null) return comment;
  }

  return null;
}

/***
 * Returns declaration positions that may own a leading Paradox comment.
 */
function getCommentTargetStarts(node: MorphNode): number[] {
  const starts = [node.getStart(false)];

  if (Node.isVariableDeclaration(node)) {
    const parent = node.getParent();
    const statement = Node.isVariableDeclarationList(parent) ? parent.getParent() : undefined;

    if (statement !== undefined && Node.isVariableStatement(statement)) {
      starts.unshift(statement.getStart(false));
    }
  }

  return starts;
}

/***
 * Reads a Paradox doc comment directly before a target position.
 */
function readCommentBefore(text: string, nodeStart: number): string | null {
  const beforeNode = text.slice(0, nodeStart);
  const commentStart = beforeNode.lastIndexOf('/***');

  if (commentStart === -1) return null;

  const commentEnd = text.indexOf('*/', commentStart);

  if (commentEnd === -1 || commentEnd > nodeStart) return null;

  const between = text.slice(commentEnd + 2, nodeStart);

  if (!/^[\s;]*(export\s+)?(default\s+)?$/.test(between)) return null;

  return text.slice(commentStart, commentEnd + 2);
}
