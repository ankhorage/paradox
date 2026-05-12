import { relative } from 'node:path';

import {
  type ArrowFunction,
  type ArrayLiteralExpression,
  type FunctionDeclaration,
  type FunctionExpression,
  type MethodDeclaration,
  type MethodSignature,
  Node,
  type ObjectLiteralExpression,
  type Symbol as MorphSymbol,
  type VariableDeclaration,
} from 'ts-morph';

import type {
  AnalysisExport,
  AnalysisMember,
  AnalysisParameter,
  AnalysisSignature,
  AnalysisSourceLocation,
  AnalysisStructuredRow,
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
  | 'exportPaths'
  | 'members'
  | 'modulePath'
  | 'relatedSymbols'
  | 'signatures'
  | 'sourceLocation'
  | 'structuredRows'
> {
  const modulePath = toPosixPath(
    relative(options.root, options.node.getSourceFile().getFilePath()),
  );
  const sourceLocation = getSourceLocation(options.node, options.root);
  const signatures = getSignatures(options.symbol, options.node);
  const members = getMembers(options.node);
  const structuredRows = getStructuredRows(options.node, options.name);
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
    structuredRows,
  };
}

/***
 * Resolves the source location for a declaration relative to the package root.
 */
function getSourceLocation(node: Node, root: string): AnalysisSourceLocation {
  const sourceFile = node.getSourceFile();
  const { column, line } = sourceFile.getLineAndColumnAtPos(node.getStart(false));

  return {
    filePath: toPosixPath(relative(root, sourceFile.getFilePath())),
    line,
    column,
  };
}

/***
 * Extracts callable signatures for exported functions and callable values.
 */
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

/***
 * Builds one normalized call signature from a callable declaration.
 */
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

/***
 * Extracts members for interface and type literal exports.
 */
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

/***
 * Converts TypeScript properties into documented member metadata.
 */
function getMembersFromProperties(properties: readonly MorphSymbol[]): AnalysisMember[] {
  return properties.flatMap((property): AnalysisMember[] => {
    const declaration = getFirstDeclaration(property.getDeclarations());

    if (declaration === null) {
      return [];
    }

    const rawComment = getParadoxComment(declaration);
    const parsed = rawComment
      ? parseParadoxComment(rawComment)
      : {
          description: null,
          isConfig: false,
          isReadme: false,
          examples: [],
          params: {},
          returns: null,
        };

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

/***
 * Extracts table-like rows from exported const arrays of object literals.
 */
function getStructuredRows(node: Node, exportName: string): AnalysisStructuredRow[] {
  const declaration = getVariableDeclaration(node, exportName);
  if (declaration === null) return [];

  const initializer = getStructuredArrayLiteral(declaration.getInitializer());
  if (initializer === null) return [];

  return initializer.getElements().flatMap((element): AnalysisStructuredRow[] => {
    if (!Node.isObjectLiteralExpression(element)) return [];

    const values = getObjectLiteralValues(element);
    return Object.keys(values).length > 0 ? [{ values }] : [];
  });
}

/***
 * Resolves const assertions and returns the array literal used for structured docs.
 */
function getStructuredArrayLiteral(node: Node | undefined): ArrayLiteralExpression | null {
  if (node === undefined) return null;
  if (Node.isArrayLiteralExpression(node)) return node;
  if (Node.isAsExpression(node)) return getStructuredArrayLiteral(node.getExpression());
  return null;
}

/***
 * Resolves a variable declaration from declaration nodes used by export symbols.
 */
function getVariableDeclaration(node: Node, exportName: string): VariableDeclaration | null {
  if (Node.isVariableDeclaration(node)) return node;

  if (Node.isVariableStatement(node)) {
    return (
      node
        .getDeclarationList()
        .getDeclarations()
        .find((declaration) => declaration.getName() === exportName) ?? null
    );
  }

  if (Node.isVariableDeclarationList(node)) {
    return node.getDeclarations().find((declaration) => declaration.getName() === exportName) ?? null;
  }

  return null;
}

/***
 * Extracts primitive and string-array values from one object literal.
 */
function getObjectLiteralValues(node: ObjectLiteralExpression): Record<string, string> {
  const values: Record<string, string> = {};

  for (const property of node.getProperties()) {
    if (!Node.isPropertyAssignment(property)) continue;

    const name = property.getName().replace(/^['"]|['"]$/g, '');
    const value = getLiteralValue(property.getInitializer());
    if (value !== null) {
      values[name] = value;
    }
  }

  return values;
}

/***
 * Converts supported literal expressions into displayable string values.
 */
function getLiteralValue(node: Node | undefined): string | null {
  if (node === undefined) return null;
  if (Node.isStringLiteral(node)) return node.getLiteralText();
  if (Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralText();
  if (node.getKindName() === 'TrueKeyword') return 'true';
  if (node.getKindName() === 'FalseKeyword') return 'false';
  if (Node.isNumericLiteral(node)) return node.getText();

  if (Node.isArrayLiteralExpression(node)) {
    const values = node.getElements().map((element) => getLiteralValue(element));
    if (values.some((value) => value === null)) return null;
    return values.join(', ');
  }

  return null;
}

/***
 * Returns the first declaration for a symbol, or null when none exists.
 */
function getFirstDeclaration(declarations: readonly Node[]): Node | null {
  const [declaration = null] = declarations;
  return declaration;
}

/***
 * Finds callable declarations associated with an export symbol.
 */
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

/***
 * Returns the callable node represented by a declaration when one exists.
 */
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

/***
 * Checks whether a node is a method declaration or method signature.
 */
function isMemberMethodDeclaration(node: Node): node is MethodDeclaration | MethodSignature {
  return Node.isMethodDeclaration(node) || Node.isMethodSignature(node);
}

/***
 * Reads Paradox comment metadata from a declaration.
 */
function readParadoxMetadata(node: Node) {
  const rawComment = getParadoxComment(node);
  return rawComment
    ? parseParadoxComment(rawComment)
    : {
        description: null,
        isConfig: false,
        isReadme: false,
        examples: [],
        params: {},
        returns: null,
      };
}

/***
 * Finds related exported symbols mentioned in signature and member type text.
 */
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

/***
 * Normalizes platform-specific path separators for generated documentation output.
 */
function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

/***
 * Returns unique items by a caller-provided key while preserving first occurrence order.
 */
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
