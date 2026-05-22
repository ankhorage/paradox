/***
 * Serializable model consumed by renderers and writers.
 */
export interface DocumentationModel {
  packageName: string;
  packageId: string;
  description: string | null;
  badges: GeneratedBadge[];
  usage: UsageModel | null;
  readmeUsage: ReadmeUsageModel[];
  config: ConfigModel | null;
  entrypoints: string[];
  modules: ModuleModel[];
  exports: ExportModel[];
  components: ComponentModel[];
  sourceFunctions: SourceFunctionModel[];
  sequenceScenarios: SequenceScenarioModel[];
  graphs: GraphModel;
}

export interface GeneratedBadge {
  id: string;
  label: string;
  value: string;
  color: string;
}

interface UsageModel {
  packageName: string;
  commands: UsageCommandModel[];
}

interface UsageCommandModel {
  name: string;
  command: string;
}

interface ReadmeUsageModel {
  title: string | null;
  description: string | null;
  language: string;
  code: string;
  sourcePath: string;
}

interface ConfigModel {
  exportName: string;
  isReadme: boolean;
  configFile: string;
  factoryName: string | null;
  members: ConfigMemberModel[];
}

export interface ExportModel {
  name: string;
  description: string | null;
  isReadme: boolean;
  examples: ExampleModel[];
  kind: ExportKind;
  modulePath: string;
  sourceLocation: SourceLocationModel;
  exportPaths: string[];
  relatedSymbols: string[];
  signatures: SignatureModel[];
  members: MemberModel[];
  structuredRows: StructuredRowModel[];
}

export type ExportKind = 'function' | 'type' | 'value' | 'unknown';

export interface ComponentModel {
  name: string;
  description: string | null;
  isReadme: boolean;
  examples: ExampleModel[];
  modulePath: string;
  sourceLocation: SourceLocationModel;
  exportPaths: string[];
  props: PropModel[];
}

interface SourceFunctionModel {
  name: string;
  description: string | null;
  sourceLocation: SourceLocationModel;
}

export interface SequenceScenarioModel {
  kind: 'bin' | 'export';
  name: string;
  sourcePath: string;
  symbolName: string;
  description: string | null;
  isReadme: boolean;
}

interface ExampleModel {
  title: string | null;
  language: string | null;
  code: string;
}

interface SourceLocationModel {
  filePath: string;
  line: number;
  column: number;
}

interface SignatureModel {
  label: string;
  parameters: ParameterModel[];
  returnType: string | null;
  returnDescription: string | null;
}

interface ParameterModel {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}

interface MemberModel {
  name: string;
  kind: 'property' | 'method';
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: MemberModel[];
}

interface StructuredRowModel {
  values: Record<string, string>;
}

export interface ModuleModel {
  path: string;
  isEntrypoint: boolean;
  dependencies: string[];
  exports: string[];
}

interface PropModel {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string | null;
}

interface ConfigMemberModel {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: ConfigMemberModel[];
}

interface GraphModel {
  imports: ImportEdgeModel[];
  calls: CallEdgeModel[];
  typeReferences: TypeReferenceEdgeModel[];
  componentComposition: ComponentCompositionEdgeModel[];
}

interface ImportEdgeModel {
  fromPath: string;
  toPath: string;
  sourcePath: string;
}

interface CallEdgeModel {
  fromSymbol: string;
  toSymbol: string;
  callExpression: string;
  sourcePath: string;
}

interface TypeReferenceEdgeModel {
  fromSymbol: string;
  toType: string;
  sourcePath: string;
}

interface ComponentCompositionEdgeModel {
  fromComponent: string;
  toComponent: string;
  jsxElement: string;
  sourcePath: string;
}
