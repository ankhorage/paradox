import { Node } from 'ts-morph';

/***
 * Detects simple React component declarations by name and return type.
 */
export function isReactComponent(node: Node): boolean {
  const name = getDeclarationName(node);

  if (!name || !/^[A-Z]/.test(name)) return false;

  const callSignature = getCallSignature(node);
  const returnType = callSignature?.getReturnType().getText() ?? null;

  if (returnType == null) return false;

  return /JSX\.Element|ReactElement|ReactNode|Element/.test(returnType);
}

function getDeclarationName(node: Node): string | null {
  if (Node.isFunctionDeclaration(node)) return node.getName() ?? null;
  if (Node.isVariableDeclaration(node)) return node.getName();
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
