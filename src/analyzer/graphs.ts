import type { CallExpression, JsxOpeningElement, JsxSelfClosingElement, Node } from 'ts-morph';
import { Node as MorphNode } from 'ts-morph';

import { collectExports } from './exports.js';
import type {
  AnalyzedExport,
  AnalyzedProgram,
  CallEdge,
  ComponentCompositionEdge,
  ImportEdge,
} from './model.js';
import { isNodeModulePath, isPathInsideRoot, relativeToRoot } from './utils.js';

/***
 * Collects local import relationships between source files.
 */
export function collectImportGraph(program: AnalyzedProgram): ImportEdge[] {
  const edges: ImportEdge[] = [];

  for (const sourceFile of program.project.getSourceFiles()) {
    if (sourceFile.isDeclarationFile()) continue;
    if (!isPathInsideRoot(program.root, sourceFile.getFilePath())) continue;
    if (isNodeModulePath(sourceFile.getFilePath())) continue;
    const sourcePath = relativeToRoot(program.root, sourceFile.getFilePath());

    const moduleDeclarations = [
      ...sourceFile.getImportDeclarations(),
      ...sourceFile.getExportDeclarations(),
    ];

    for (const declaration of moduleDeclarations) {
      const dependency = declaration.getModuleSpecifierSourceFile();
      if (!dependency) continue;
      const dependencyPath = dependency.getFilePath();
      if (!isPathInsideRoot(program.root, dependencyPath) || isNodeModulePath(dependencyPath))
        continue;
      edges.push({
        fromPath: sourcePath,
        toPath: relativeToRoot(program.root, dependencyPath),
        sourcePath,
      });
    }
  }

  return uniqueEdges(edges, (edge) => `${edge.fromPath}->${edge.toPath}`);
}

/***
 * Collects call relationships between local symbols.
 */
export function collectCallGraph(program: AnalyzedProgram): CallEdge[] {
  const edges: CallEdge[] = [];

  for (const sourceFile of program.project.getSourceFiles()) {
    if (sourceFile.isDeclarationFile()) continue;
    if (!isPathInsideRoot(program.root, sourceFile.getFilePath())) continue;
    if (isNodeModulePath(sourceFile.getFilePath())) continue;
    const sourcePath = relativeToRoot(program.root, sourceFile.getFilePath());

    sourceFile.forEachDescendant((node) => {
      if (!MorphNode.isCallExpression(node)) return;
      const edge = toCallEdge(program, node, sourcePath);
      if (edge) edges.push(edge);
    });
  }

  return uniqueEdges(
    edges,
    (edge) => `${edge.fromSymbol}->${edge.toSymbol}@${edge.sourcePath}:${edge.callExpression}`,
  );
}

/***
 * Collects component composition edges for React components.
 */
export function collectComponentCompositionGraph(
  program: AnalyzedProgram,
  exports: AnalyzedExport[] = collectExports(program),
): ComponentCompositionEdge[] {
  const edges: ComponentCompositionEdge[] = [];
  const components = exports.filter((entry) => entry.kind === 'component');

  for (const component of components) {
    const componentName = component.name;
    const { sourcePath } = component;
    const jsxElements = findJsxElements(component.node);

    for (const element of jsxElements) {
      const tagName = element.getTagNameNode().getText();
      if (!/^[A-Z]/.test(tagName)) continue;
      edges.push({
        fromComponent: componentName,
        toComponent: tagName,
        jsxElement: element.getText(),
        sourcePath,
      });
    }
  }

  return uniqueEdges(
    edges,
    (edge) => `${edge.fromComponent}->${edge.toComponent}@${edge.sourcePath}:${edge.jsxElement}`,
  );
}

function toCallEdge(
  program: AnalyzedProgram,
  node: CallExpression,
  sourcePath: string,
): CallEdge | null {
  const expression = node.getExpression();
  const symbol = expression.getSymbol() ?? expression.getType().getSymbol();
  if (!symbol) return null;

  const declarations = symbol.getDeclarations();
  if (declarations.length === 0) return null;
  const [declaration] = declarations;
  const declarationPath = declaration.getSourceFile().getFilePath();
  if (!isPathInsideRoot(program.root, declarationPath) || isNodeModulePath(declarationPath))
    return null;

  const fromSymbol = getEnclosingSymbolName(node) ?? sourcePath;
  const toSymbol = symbol.getName();

  if (!toSymbol) return null;

  return {
    fromSymbol,
    toSymbol,
    callExpression: expression.getText(),
    sourcePath,
  };
}

function findJsxElements(node: Node): (JsxOpeningElement | JsxSelfClosingElement)[] {
  const elements: (JsxOpeningElement | JsxSelfClosingElement)[] = [];
  node.forEachDescendant((descendant) => {
    if (
      MorphNode.isJsxSelfClosingElement(descendant) ||
      MorphNode.isJsxOpeningElement(descendant)
    ) {
      elements.push(descendant);
    }
  });
  return elements;
}

function getEnclosingSymbolName(node: Node): string | null {
  const ancestor = node.getFirstAncestor((candidate) => {
    return (
      MorphNode.isFunctionDeclaration(candidate) ||
      MorphNode.isMethodDeclaration(candidate) ||
      MorphNode.isFunctionExpression(candidate) ||
      MorphNode.isArrowFunction(candidate) ||
      MorphNode.isClassDeclaration(candidate)
    );
  });

  if (!ancestor) return null;

  if (MorphNode.isFunctionDeclaration(ancestor)) return ancestor.getName() ?? null;
  if (MorphNode.isMethodDeclaration(ancestor)) return ancestor.getName();
  if (MorphNode.isClassDeclaration(ancestor)) return ancestor.getName() ?? null;

  if (MorphNode.isArrowFunction(ancestor) || MorphNode.isFunctionExpression(ancestor)) {
    const parent = ancestor.getParent();
    if (MorphNode.isVariableDeclaration(parent)) return parent.getName();
    if (MorphNode.isPropertyAssignment(parent)) return parent.getName();
  }

  return null;
}

function uniqueEdges<T>(edges: readonly T[], key: (edge: T) => string): T[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const edgeKey = key(edge);
    if (seen.has(edgeKey)) return false;
    seen.add(edgeKey);
    return true;
  });
}
