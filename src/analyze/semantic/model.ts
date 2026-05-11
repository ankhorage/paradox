import type { Node, Project, SourceFile, Symbol, Type, TypeChecker } from 'ts-morph';

export interface AnalyzedProgram {
  project: Project;
  typeChecker: TypeChecker;
  root: string;
  entrypoints: string[];
  entrypointFilePaths: string[];
}

export interface AnalyzedFile {
  path: string;
  sourceFile: SourceFile;
  isEntrypoint: boolean;
}

export interface AnalyzedDocBlock {
  id: string;
  sourcePath: string;
  start: number;
  end: number;
  line: number;
  column: number;
  raw: string;
  description: string | null;
  params: Record<string, string>;
  returns: string | null;
  tags: AnalyzedTag[];
}

export interface AnalyzedTag {
  name: string;
  value: string | null;
}

export type AnalyzedExportKind =
  | 'function'
  | 'component'
  | 'class'
  | 'interface'
  | 'type'
  | 'const'
  | 'hook'
  | 'unknown';

export interface AnalyzedExport {
  name: string;
  sourcePath: string;
  exportPaths: string[];
  kind: AnalyzedExportKind;
  signature?: string;
  docBlock?: AnalyzedDocBlock;
  tags: AnalyzedTag[];
  props?: AnalyzedProps;
  typeMembers?: AnalyzedTypeMember[];
  relatedTypes: string[];
  node: Node;
  symbol: Symbol;
}

export interface ResolvedTypeReference {
  type: Type;
  name: string | null;
  sourcePath: string | null;
  symbol: Symbol | null;
}

export interface AnalyzedProps {
  typeName: string;
  sourcePath: string | null;
  members: AnalyzedProp[];
}

export interface AnalyzedProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
  inheritedFrom?: string;
}

export interface AnalyzedTypeMember {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: AnalyzedTypeMember[];
}

export interface ImportEdge {
  fromPath: string;
  toPath: string;
  sourcePath: string;
}

export interface CallEdge {
  fromSymbol: string;
  toSymbol: string;
  callExpression: string;
  sourcePath: string;
}

interface TypeReferenceEdge {
  fromSymbol: string;
  toType: string;
  sourcePath: string;
}

export interface ComponentCompositionEdge {
  fromComponent: string;
  toComponent: string;
  jsxElement: string;
  sourcePath: string;
}

interface AnalyzedGraphs {
  imports: ImportEdge[];
  calls: CallEdge[];
  typeReferences: TypeReferenceEdge[];
  componentComposition: ComponentCompositionEdge[];
}

export interface AnalyzedProject {
  files: AnalyzedFile[];
  exports: AnalyzedExport[];
  docBlocks: AnalyzedDocBlock[];
  tags: AnalyzedTag[];
  graphs: AnalyzedGraphs;
}
