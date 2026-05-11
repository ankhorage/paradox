import type { Node, ParameterDeclaration, Symbol as MorphSymbol, Type } from 'ts-morph';
import { Node as MorphNode, TypeFormatFlags } from 'ts-morph';

import { getParadoxComment } from '../analyze/utils/getParadoxComment.js';
import { isReactComponent } from '../analyze/utils/isReactComponent.js';
import { parseParadoxComment } from '../analyze/utils/parseParadoxComment.js';
import type {
  AnalyzedExport,
  AnalyzedExportKind,
  AnalyzedProgram,
  AnalyzedProp,
  AnalyzedProps,
  AnalyzedTypeMember,
  ResolvedTypeReference,
} from './model.js';
import { isNodeModulePath, isPathInsideRoot, relativeToRoot } from './utils.js';

/***
 * Collects exported declarations from configured entrypoints.
 */
export function collectExports(program: AnalyzedProgram): AnalyzedExport[] {
  const exportsByName = new Map<string, AnalyzedExport>();

  for (const entrypoint of program.entrypointFilePaths) {
    const sourceFile = program.project.getSourceFile((file) => file.getFilePath() === entrypoint);
    if (!sourceFile) continue;

    const entrypointPath = relativeToRoot(program.root, sourceFile.getFilePath());

    for (const symbol of sourceFile.getExportSymbols()) {
      const resolved = resolveExportSymbol(symbol);
      const declaration = getFirstDeclaration(resolved.getDeclarations());
      if (!declaration) continue;

      const name = resolved.getName();
      const sourcePath = relativeToRoot(program.root, declaration.getSourceFile().getFilePath());
      const existing = exportsByName.get(name);
      const exportPaths = existing
        ? uniqueSorted([...existing.exportPaths, entrypointPath])
        : [entrypointPath];
      const kind = existing?.kind ?? detectExportKind(declaration);

      exportsByName.set(name, {
        name,
        sourcePath,
        exportPaths,
        kind,
        signature: existing?.signature,
        docBlock: existing?.docBlock,
        tags: existing?.tags ?? [],
        props: existing?.props,
        typeMembers: existing?.typeMembers,
        relatedTypes: existing?.relatedTypes ?? [],
        node: declaration,
        symbol: resolved,
      });
    }
  }

  return [...exportsByName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/***
 * Determines the kind of export for documentation.
 */
export function detectExportKind(node: Node): AnalyzedExportKind {
  if (isReactComponent(node)) return 'component';
  const name = getDeclarationName(node);
  if (name && /^use[A-Z]/.test(name)) return 'hook';
  if (MorphNode.isFunctionDeclaration(node)) return 'function';
  if (MorphNode.isClassDeclaration(node)) return 'class';
  if (MorphNode.isInterfaceDeclaration(node)) return 'interface';
  if (MorphNode.isTypeAliasDeclaration(node)) return 'type';
  if (MorphNode.isVariableDeclaration(node)) return 'const';
  return 'unknown';
}

/***
 * Returns a human-readable signature for callable exports.
 */
export function getExportSignature(
  _program: AnalyzedProgram,
  analyzedExport: Pick<AnalyzedExport, 'node'>,
): string | undefined {
  const callableNode = getCallableNode(analyzedExport.node);
  if (!callableNode) return undefined;

  const callSignatures = callableNode.getType().getCallSignatures();
  if (callSignatures.length === 0) return undefined;
  const [callSignature] = callSignatures;

  const parameters = callSignature.getParameters().map((parameter) => {
    const declaration = getFirstDeclaration(parameter.getDeclarations());
    const name = parameter.getName();
    const isOptional =
      declaration && MorphNode.isParameterDeclaration(declaration)
        ? declaration.isOptional()
        : false;
    const type = declaration
      ? parameter.getTypeAtLocation(declaration).getText(declaration)
      : parameter.getTypeAtLocation(callableNode).getText(callableNode);
    return `${name}${isOptional ? '?' : ''}: ${type}`;
  });
  const returnType = callSignature.getReturnType().getText(callableNode);
  const returnSuffix = returnType === 'void' ? '' : ` => ${returnType}`;

  return `(${parameters.join(', ')})${returnSuffix}`;
}

/***
 * Resolves a named type reference from a node or symbol.
 */
export function resolveTypeReference(
  program: AnalyzedProgram,
  typeNodeOrSymbol: Node | Type | MorphSymbol,
): ResolvedTypeReference | null {
  const type = MorphNode.isNode(typeNodeOrSymbol)
    ? typeNodeOrSymbol.getType()
    : 'getText' in typeNodeOrSymbol
      ? typeNodeOrSymbol
      : typeNodeOrSymbol.getDeclaredType();

  const symbol =
    type.getSymbol() ?? ('getDeclarations' in typeNodeOrSymbol ? typeNodeOrSymbol : null);
  const name = symbol?.getName() ?? null;
  const declaration = getFirstDeclaration(symbol?.getDeclarations() ?? []);
  const sourcePath = declaration
    ? relativeToRoot(program.root, declaration.getSourceFile().getFilePath())
    : null;

  return {
    type,
    name,
    sourcePath,
    symbol: symbol ?? null,
  };
}

/***
 * Collects nested type members for interfaces and type literals.
 */
export function collectTypeMembers(
  program: AnalyzedProgram,
  reference: ResolvedTypeReference,
  options: { inheritedFrom?: string; depth?: number } = {},
): AnalyzedTypeMember[] {
  const depth = options.depth ?? 0;
  if (depth > 3) return [];

  const membersByName = new Map<string, AnalyzedTypeMember>();
  const ownMembers = collectMembersFromType(program, reference, options.inheritedFrom, depth);

  for (const member of ownMembers) {
    membersByName.set(member.name, member);
  }

  const baseTypes = reference.type.getBaseTypes();
  for (const baseType of baseTypes) {
    const baseReference = resolveTypeReference(program, baseType);
    if (!baseReference) continue;
    const baseName = baseReference.name ?? 'BaseType';
    const baseMembers = collectTypeMembers(program, baseReference, {
      inheritedFrom: baseName,
      depth: depth + 1,
    });
    for (const member of baseMembers) {
      if (!membersByName.has(member.name)) {
        membersByName.set(member.name, member);
      }
    }
  }

  return [...membersByName.values()];
}

/***
 * Extracts props metadata for a callable export.
 */
export function collectPropsForExport(
  program: AnalyzedProgram,
  analyzedExport: Pick<AnalyzedExport, 'name' | 'node'>,
): AnalyzedProps | undefined {
  const callableNode = getCallableNode(analyzedExport.node);
  if (!callableNode) return undefined;

  const parameters = callableNode.getParameters();
  if (parameters.length === 0) return undefined;
  const [parameter] = parameters;

  const parameterType = parameter.getType();
  if (parameterType.isAny()) return undefined;

  const resolved = resolveTypeReference(program, parameterType);
  if (!resolved) return undefined;

  const typeName =
    resolved.name ??
    parameterType.getText(parameter, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  const defaultValues = collectDefaultValuesFromBinding(parameter);
  const members = collectTypeMembers(program, resolved)
    .filter((member) => member.name.length > 0)
    .map(
      (member): AnalyzedProp => ({
        name: member.name,
        type: member.type,
        required: member.required,
        defaultValue: defaultValues[member.name],
        description: member.description,
        inheritedFrom: member.inheritedFrom,
      }),
    );

  return {
    typeName,
    sourcePath: resolved.sourcePath,
    members,
  };
}

/***
 * Collects default values from destructured bindings.
 */
export function collectDefaultValuesFromBinding(
  parameter: ParameterDeclaration,
): Record<string, string> {
  const defaults: Record<string, string> = {};
  const nameNode = parameter.getNameNode();
  if (!MorphNode.isObjectBindingPattern(nameNode)) return defaults;

  for (const element of nameNode.getElements()) {
    const initializer = element.getInitializer();
    if (!initializer) continue;
    const name = element.getName();
    defaults[name] = initializer.getText();
  }

  return defaults;
}

/***
 * Collects related types referenced by an export.
 */
export function collectRelatedTypes(
  analyzedExport: Pick<AnalyzedExport, 'name' | 'signature' | 'props' | 'typeMembers'>,
): string[] {
  const candidates: string[] = [];
  if (analyzedExport.signature) candidates.push(analyzedExport.signature);
  if (analyzedExport.props) {
    candidates.push(analyzedExport.props.typeName);
    candidates.push(...analyzedExport.props.members.map((member) => member.type));
  }
  if (analyzedExport.typeMembers) {
    candidates.push(...flattenMembers(analyzedExport.typeMembers).map((member) => member.type));
  }

  const related = new Set<string>();

  for (const candidate of candidates) {
    for (const match of candidate.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)) {
      const [name] = match;
      if (!IGNORED_RELATED_SYMBOLS.has(name) && name !== analyzedExport.name) {
        related.add(name);
      }
    }
  }

  return [...related].sort((left, right) => left.localeCompare(right));
}

function collectMembersFromType(
  program: AnalyzedProgram,
  reference: ResolvedTypeReference,
  inheritedFrom: string | undefined,
  depth: number,
): AnalyzedTypeMember[] {
  const declarationMembers = getDeclaredMembers(reference);
  const declarations =
    declarationMembers.length > 0 ? declarationMembers : reference.type.getProperties();

  return declarations.flatMap((property) => {
    const declaration = getFirstDeclaration(property.getDeclarations());
    if (!declaration) return [];

    const propertyType = property.getTypeAtLocation(declaration);
    const rawComment = getParadoxComment(declaration);
    const parsed = rawComment
      ? parseParadoxComment(rawComment)
      : { description: null, isConfig: false, params: {}, returns: null };
    const required = !property.isOptional() && !isUndefinedUnion(propertyType);
    const childReference = shouldExpandType(program, propertyType)
      ? resolveTypeReference(program, propertyType)
      : null;
    const children = childReference
      ? collectTypeMembers(program, childReference, {
          inheritedFrom: undefined,
          depth: depth + 1,
        })
      : undefined;

    const declaredTypeText = getDeclaredTypeText(declaration);
    const baseTypeText =
      declaredTypeText ??
      propertyType.getText(declaration, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
    const typeText =
      !required && !baseTypeText.includes('undefined')
        ? `${baseTypeText} | undefined`
        : baseTypeText;

    return [
      {
        name: property.getName(),
        type: typeText,
        required,
        description: parsed.description ?? undefined,
        inheritedFrom,
        children: children && children.length > 0 ? children : undefined,
      } satisfies AnalyzedTypeMember,
    ];
  });
}

function getDeclaredTypeText(declaration: Node): string | null {
  if (MorphNode.isPropertySignature(declaration) || MorphNode.isPropertyDeclaration(declaration)) {
    const typeNode = declaration.getTypeNode();
    if (!typeNode) return null;
    if (MorphNode.isTypeLiteral(typeNode)) return null;
    return typeNode.getText();
  }

  return null;
}

function getDeclaredMembers(reference: ResolvedTypeReference) {
  const declarations = reference.symbol?.getDeclarations() ?? [];
  const members: MorphSymbol[] = [];

  for (const declaration of declarations) {
    if (MorphNode.isInterfaceDeclaration(declaration)) {
      for (const property of declaration.getProperties()) {
        const symbol = property.getSymbol();
        if (symbol) members.push(symbol);
      }
      for (const method of declaration.getMethods()) {
        const symbol = method.getSymbol();
        if (symbol) members.push(symbol);
      }
    } else if (MorphNode.isTypeAliasDeclaration(declaration)) {
      const typeNode = declaration.getTypeNode();
      if (typeNode && MorphNode.isTypeLiteral(typeNode)) {
        for (const member of typeNode.getMembers()) {
          if (MorphNode.isPropertySignature(member) || MorphNode.isMethodSignature(member)) {
            const symbol = member.getSymbol();
            if (symbol) members.push(symbol);
          }
        }
      }
    }
  }

  return members;
}

function shouldExpandType(program: AnalyzedProgram, type: Type): boolean {
  if (type.isUnion() || type.isIntersection()) return false;
  if (type.isString() || type.isNumber() || type.isBoolean() || type.isEnum()) return false;
  const symbol = type.getSymbol();
  const declaration = getFirstDeclaration(symbol?.getDeclarations() ?? []);
  if (declaration) {
    const sourceFile = declaration.getSourceFile();
    const sourcePath = relativeToRoot(program.root, sourceFile.getFilePath());
    return !sourcePath.includes('node_modules');
  }

  if (!type.isObject()) return false;

  const propertyDeclarations = type
    .getProperties()
    .flatMap((property) => property.getDeclarations());

  return propertyDeclarations.some((decl) => {
    const filePath = decl.getSourceFile().getFilePath();
    return isPathInsideRoot(program.root, filePath) && !isNodeModulePath(filePath);
  });
}

function flattenMembers(members: readonly AnalyzedTypeMember[]): AnalyzedTypeMember[] {
  return members.flatMap((member) => [
    member,
    ...(member.children ? flattenMembers(member.children) : []),
  ]);
}

function isUndefinedUnion(type: Type): boolean {
  if (!type.isUnion()) return false;
  return type.getUnionTypes().some((unionType) => unionType.isUndefined());
}

function getFirstDeclaration(declarations: readonly Node[]): Node | null {
  const [declaration = null] = declarations;
  return declaration;
}

function resolveExportSymbol(symbol: MorphSymbol): MorphSymbol {
  return symbol.getAliasedSymbol() ?? symbol;
}

function getDeclarationName(node: Node): string | null {
  if (MorphNode.isFunctionDeclaration(node)) return node.getName() ?? null;
  if (MorphNode.isVariableDeclaration(node)) return node.getName();
  if (MorphNode.isClassDeclaration(node)) return node.getName() ?? null;
  if (MorphNode.isInterfaceDeclaration(node)) return node.getName();
  if (MorphNode.isTypeAliasDeclaration(node)) return node.getName();
  return null;
}

function getCallableNode(node: Node) {
  if (MorphNode.isFunctionDeclaration(node)) return node;
  if (MorphNode.isMethodDeclaration(node)) return node;
  if (MorphNode.isMethodSignature(node)) return node;
  if (MorphNode.isArrowFunction(node)) return node;
  if (MorphNode.isFunctionExpression(node)) return node;

  if (MorphNode.isVariableDeclaration(node)) {
    const initializer = node.getInitializer();
    if (
      initializer &&
      (MorphNode.isArrowFunction(initializer) || MorphNode.isFunctionExpression(initializer))
    ) {
      return initializer;
    }
  }

  return null;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

const IGNORED_RELATED_SYMBOLS = new Set([
  'Array',
  'Boolean',
  'Date',
  'Element',
  'JSX',
  'Map',
  'Number',
  'Promise',
  'ReadonlyArray',
  'Record',
  'Set',
  'String',
]);
