/***
 * Serializable model consumed by renderers and writers.
 */
export interface DocumentationModel {
  packageName: string;
  packageId: string;
  description: string | null;
  usage: UsageModel | null;
  config: ConfigModel | null;
  entrypoints: string[];
  modules: ModuleModel[];
  exports: ExportModel[];
  components: ComponentModel[];
}

export interface UsageModel {
  packageName: string;
  commands: UsageCommandModel[];
}

export interface UsageCommandModel {
  name: string;
  command: string;
}

export interface ConfigModel {
  exportName: string;
  configFile: string;
  factoryName: string | null;
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

export interface SourceLocationModel {
  filePath: string;
  line: number;
  column: number;
}

export interface SignatureModel {
  label: string;
  parameters: ParameterModel[];
  returnType: string | null;
  returnDescription: string | null;
}

export interface ParameterModel {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}

export interface MemberModel {
  name: string;
  kind: 'property' | 'method';
  type: string;
  required: boolean;
  description: string | null;
}

export interface ModuleModel {
  path: string;
  isEntrypoint: boolean;
  dependencies: string[];
  exports: string[];
}

export interface PropModel {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}
