import type { Node } from 'ts-morph';

interface AnalysisExample {
  title: string | null;
  language: string | null;
  code: string;
}

/***
 * Describes one exported declaration discovered in a package.
 */
export interface AnalysisSourceLocation {
  filePath: string;
  line: number;
  column: number;
}

export interface AnalysisParameter {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}

export interface AnalysisSignature {
  label: string;
  parameters: AnalysisParameter[];
  returnType: string | null;
  returnDescription: string | null;
}

export interface AnalysisMember {
  name: string;
  kind: 'property' | 'method';
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: AnalysisMember[];
}

export interface AnalysisStructuredRow {
  values: Record<string, string>;
}

export interface AnalysisExport {
  name: string;
  node: Node;
  description: string | null;
  isReadme: boolean;
  examples: AnalysisExample[];
  kind: 'function' | 'type' | 'value' | 'unknown';
  modulePath: string;
  sourceLocation: AnalysisSourceLocation;
  exportPaths: string[];
  relatedSymbols: string[];
  signatures: AnalysisSignature[];
  members: AnalysisMember[];
  structuredRows: AnalysisStructuredRow[];
}

/***
 * Describes one React component and its extracted props.
 */
export interface AnalysisComponent {
  name: string;
  description: string | null;
  isReadme: boolean;
  examples: AnalysisExample[];
  modulePath: string;
  sourceLocation: AnalysisSourceLocation;
  exportPaths: string[];
  props: {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    description: string | null;
  }[];
}

export interface AnalysisUsage {
  packageName: string;
  commands: AnalysisUsageCommand[];
}

interface AnalysisUsageCommand {
  name: string;
  command: string;
}

interface AnalysisReadmeUsage {
  title: string | null;
  description: string | null;
  language: string;
  code: string;
  sourcePath: string;
}

interface AnalysisReadmeConfig {
  description: string | null;
  language: string;
  code: string;
  sourcePath: string;
}

export interface AnalysisBadge {
  id: string;
  label: string;
  value: string;
  color: string;
}

export interface AnalysisModule {
  path: string;
  isEntrypoint: boolean;
  dependencies: string[];
  exports: string[];
}

export interface AnalysisSequenceScenario {
  kind: 'bin' | 'export';
  name: string;
  sourcePath: string;
  symbolName: string;
  description: string | null;
  isReadme: boolean;
}

export interface AnalysisSourceFunction {
  name: string;
  description: string | null;
  sourceLocation: AnalysisSourceLocation;
}

interface AnalysisTypeMember {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: AnalysisTypeMember[];
}

interface ImportEdge {
  fromPath: string;
  toPath: string;
  sourcePath: string;
}

interface CallEdge {
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

interface ComponentCompositionEdge {
  fromComponent: string;
  toComponent: string;
  jsxElement: string;
  sourcePath: string;
}

interface AnalysisGraphs {
  imports: ImportEdge[];
  calls: CallEdge[];
  typeReferences: TypeReferenceEdge[];
  componentComposition: ComponentCompositionEdge[];
}

/***
 * Complete analysis output used to build the documentation model.
 */
export interface AnalysisResult {
  packageName: string;
  packageId: string;
  description: string | null;

  exports: AnalysisExport[];
  components: AnalysisComponent[];
  sourceFunctions: AnalysisSourceFunction[];
  entrypoints: string[];
  modules: AnalysisModule[];
  badges: AnalysisBadge[];
  sequenceScenarios: AnalysisSequenceScenario[];

  usage: AnalysisUsage | null;
  readmeUsageDescription: string | null;
  readmeUsage: AnalysisReadmeUsage[];
  readmeConfig: AnalysisReadmeConfig | null;

  config: {
    exportName: string;
    isReadme: boolean;
    members: AnalysisTypeMember[];
  } | null;
  graphs: AnalysisGraphs;
}
