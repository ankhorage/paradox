import { Node, type Type } from 'ts-morph';

/***
 * Returns the first parameter type for a React component declaration.
 */
export function getComponentPropsType(node: Node): Type | null {
  const callSignature = getCallSignature(node);
  const firstParam = callSignature?.getParameters()[0];
  const firstDecl = firstParam?.getDeclarations()[0];

  if (firstDecl) return firstParam.getTypeAtLocation(firstDecl);

  return null;
}

function getCallSignature(node: Node) {
  if (Node.isFunctionDeclaration(node)) {
    return node.getType().getCallSignatures()[0] ?? null;
  }

  if (Node.isVariableDeclaration(node)) {
    return node.getType().getCallSignatures()[0] ?? null;
  }

  return null;
}
