import { relative } from 'node:path';

import {
  type ArrowFunction,
  type FunctionDeclaration,
  type FunctionExpression,
  type MethodDeclaration,
  type MethodSignature,
  Node,
  type Symbol as MorphSymbol,
} from 'ts-morph';

import type {
  AnalysisExport,
  AnalysisMember,
  AnalysisParameter,
  AnalysisSignature,
  AnalysisSourceLocation,
} from '../types.js';
import { getParadoxComment } from './getParadoxComment.js';
import { parseParadoxComment } from './parseParadoxComment.js';

type CallableDeclaration =
  | ArrowFunction
  | FunctionDeclaration
  | FunctionExpression
  | MethodDeclaration
  | MethodSignature;

/***
 * Extracts computed metadata for an exported declaration.
 */
export function getExportMetadata(options: {
  name: string;
  node: Node;
  root: string;
  entrypointPath: string;
  symbol: MorphSymbol;
}): Pick<
  AnalysisExport,
  'exportPaths' | 'members' | 'modulePath' | 'relatedSymbols' | 'signatures' | 'sourceLocation'
> {
  const modulePath = toPosixPath(
    relative(options.root, options.node.getSourceFile().getFilePath()),
  );
  const sourceLocation = getSourceLocation(options.node, options.root);
  const signatures = getSignatures(options.symbol, options.node);
  const members = getMembers(options.node);
  const relatedSymbols = collectRelatedSymbols(
    options.name,
    signatures.flatMap((signature) => [
      ...signature.parameters.map((parameter) => parameter.type),
      signature.returnType,
    ]),
    members.map((member) => member.type),
  );

  return {
    modulePath,
    sourceLocation,
    exportPaths: [options.entrypointPath],
    relatedSymbols,
    signatures,
    members,
  };
}

function getSourceLocation(node: Node, root: string): AnalysisSourceLocation {
  const sourceFile = node.getSourceFile();
  const { column, line } = sourceFile.getLineAndColumnAtPos(node.getStart(false));

  return {
    filePath: toPosixPath(relative(root, sourceFile.getFilePath())),
    line,
    column,
  };
}

function getSignatures(symbol: MorphSymbol, node: Node): AnalysisSignature[] {
  const parsed = readParadoxMetadata(node);
  const signatures = getCallableDeclarations(symbol, node).map((declaration) =>
    getSignature(declaration, parsed.params, parsed.returns),
  );

  return uniqueBy(
    signatures.filter(
      (signature) =>
        signature.parameters.length > 0 ||
        signature.returnType !== null ||
        signature.returnDescription !== null,
    ),
    (signature) => signature.label,
  );
}

function getSignature(
  declaration: CallableDeclaration,
  params: Record<string, string>,
  returns: string | null,
): AnalysisSignature {
  const normalizedParameters = declaration.getParameters().map((parameter): AnalysisParameter => {
    const parameterDescription = params[parameter.getName()];

    return {
      name: parameter.getName(),
      type: parameter.getType().getText(parameter),
      required: !parameter.isOptional(),
      description: parameterDescription ? parameterDescription.trim() : null,
    };
  });
  const returnType = declaration.getReturnType().getText(declaration);
  const parameterLabel = normalizedParameters
    .map((parameter) => `${parameter.name}${parameter.required ? '' : '?'}: ${parameter.type}`)
    .join(', ');

  return {
    label: `(${parameterLabel})${returnType === 'void' ? '' : ` => ${returnType}`}`,
    parameters: normalizedParameters,
    returnType,
    returnDescription: returns,
  };
}

function getMembers(node: Node): AnalysisMember[] {
  if (getCallableNode(node) !== null) return [];

  if (Node.isInterfaceDeclaration(node)) {
    return getMembersFromProperties(node.getType().getProperties());
  }

  if (Node.isTypeAliasDeclaration(node)) {
    const typeNode = node.getTypeNode();
    if (!typeNode || !Node.isTypeLiteral(typeNode)) return [];
    return getMembersFromProperties(node.getType().getProperties());
  }

  return [];
}

function getMembersFromProperties(properties: readonly MorphSymbol[]): AnalysisMember[] {
  return properties.flatMap((property): AnalysisMember[] => {
    const declaration = getFirstDeclaration(property.getDeclarations());

    if (declaration === null) {
      return [];
    }

    const rawComment = getParadoxComment(declaration);
    const parsed = rawComment
      ? parseParadoxComment(rawComment)
      : { description: null, isConfig: false, params: {}, returns: null };

    return [
      {
        name: property.getName(),
        kind: isMemberMethodDeclaration(declaration) ? 'method' : 'property',
        type: property.getTypeAtLocation(declaration).getText(declaration),
        required: !property.isOptional(),
        description: parsed.description,
      } satisfies AnalysisMember,
    ];
  });
}

function getFirstDeclaration(declarations: readonly Node[]): Node | null {
  const [declaration = null] = declarations;
  return declaration;
}

function getCallableDeclarations(symbol: MorphSymbol, node: Node): CallableDeclaration[] {
  const declarations = symbol
    .getDeclarations()
    .map((declaration) => getCallableNode(declaration))
    .filter((declaration) => declaration !== null);

  if (declarations.length > 0) {
    return declarations;
  }

  const callableNode = getCallableNode(node);

  return callableNode !== null ? [callableNode] : [];
}

function getCallableNode(node: Node): CallableDeclaration | null {
  if (Node.isFunctionDeclaration(node)) return node;
  if (Node.isMethodDeclaration(node)) return node;
  if (Node.isMethodSignature(node)) return node;
  if (Node.isArrowFunction(node)) return node;
  if (Node.isFunctionExpression(node)) return node;

  if (Node.isVariableDeclaration(node)) {
    const initializer = node.getInitializer();
    if (
      initializer &&
      (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))
    ) {
      return initializer;
    }
  }

  return null;
}

function isMemberMethodDeclaration(node: Node): node is MethodDeclaration | MethodSignature {
  return Node.isMethodDeclaration(node) || Node.isMethodSignature(node);
}

function readParadoxMetadata(node: Node) {
  const rawComment = getParadoxComment(node);
  return rawComment
    ? parseParadoxComment(rawComment)
    : { description: null, isConfig: false, params: {}, returns: null };
}

function collectRelatedSymbols(
  exportName: string,
  ...values: (readonly (string | null)[])[]
): string[] {
  const candidates = values.flatMap((entries) => entries).filter((entry) => entry !== null);
  const related = new Set<string>();

  for (const value of candidates) {
    for (const symbol of value.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)) {
      const [candidate] = symbol;
      if (!IGNORED_RELATED_SYMBOLS.has(candidate) && candidate !== exportName) {
        related.add(candidate);
      }
    }
  }

  return [...related].sort((left, right) => left.localeCompare(right));
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

const IGNORED_RELATED_SYMBOLS = new Set([
  'Array',
  'Boolean',
  'Date',
  'Element',
  'JSX',
  'Map',
  'Promise',
  'ReadonlyArray',
  'Record',
  'Set',
  'String',
]);
