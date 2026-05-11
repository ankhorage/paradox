/***
 * Serializable model consumed by renderers and writers.
 */
export interface DocumentationModel {
  packageName: string;
  packageId: string;
  description: string | null;
  badges: GeneratedBadge[];
  usage: UsageModel | null;
  config: ConfigModel | null;
  entrypoints: string[];
  modules: ModuleModel[];
  exports: ExportModel[];
  components: ComponentModel[];
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

interface ConfigModel {
  exportName: string;
  configFile: string;
  factoryName: string | null;
  members: ConfigMemberModel[];
}

export interface ExportModel {
  name: string;
  description: string | null;
  kind: ExportKind;
  modulePath: string;
  sourceLocation: SourceLocationModel;
  exportPaths: string[];
  relatedSymbols: string[];
  signatures: SignatureModel[];
  members: MemberModel[];
}

export type ExportKind = 'function' | 'type' | 'unknown';

export interface ComponentModel {
  name: string;
  description: string | null;
  modulePath: string;
  sourceLocation: SourceLocationModel;
  exportPaths: string[];
  props: PropModel[];
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

export interface GraphModel {
  imports: ImportEdgeModel[];
  calls: CallEdgeModel[];
  typeReferences: TypeReferenceEdgeModel[];
  componentComposition: ComponentCompositionEdgeModel[];
}

export interface ImportEdgeModel {
  fromPath: string;
  toPath: string;
  sourcePath: string;
}

export interface CallEdgeModel {
  fromSymbol: string;
  toSymbol: string;
  callExpression: string;
  sourcePath: string;
}

export interface TypeReferenceEdgeModel {
  fromSymbol: string;
  toType: string;
  sourcePath: string;
}

export interface ComponentCompositionEdgeModel {
  fromComponent: string;
  toComponent: string;
  jsxElement: string;
  sourcePath: string;
}
