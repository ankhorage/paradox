import type { Node } from 'ts-morph';

/***
 * Describes one exported declaration discovered in a package.
 */
export interface AnalysisExport {
  name: string;
  node: Node;
  description: string | null;
  kind: 'function' | 'type' | 'unknown';
}

/***
 * Describes one React component and its extracted props.
 */
export interface AnalysisComponent {
  name: string;
  description: string | null;
  props: {
    name: string;
    type: string;
    required: boolean;
    description: string | null;
  }[];
}

export interface AnalysisUsage {
  packageName: string;
  commands: AnalysisUsageCommand[];
}

export interface AnalysisUsageCommand {
  name: string;
  command: string;
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

  usage: AnalysisUsage | null;

  config: {
    exportName: string;
  } | null;
}
