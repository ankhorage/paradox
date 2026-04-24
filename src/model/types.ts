/***
 * Serializable model consumed by renderers and writers.
 */
export interface DocumentationModel {
  packageName: string;
  packageId: string;
  description: string | null;
  usage: UsageModel | null;
  config: ConfigModel | null;
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
}

export type ExportKind = 'function' | 'type' | 'unknown';

export interface ComponentModel {
  name: string;
  description: string | null;
  props: PropModel[];
}

export interface PropModel {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}
