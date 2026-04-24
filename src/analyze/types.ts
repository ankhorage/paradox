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

/***
 * Complete analysis output used to build the documentation model.
 */
export interface AnalysisResult {
  packageName: string;
  packageId: string;
  description: string | null;

  exports: AnalysisExport[];
  components: AnalysisComponent[];

  usage: {
    command: string;
  } | null;

  config: {
    exportName: string;
  } | null;
}
