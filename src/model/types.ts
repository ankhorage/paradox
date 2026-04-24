import type { AnalysisComponent, AnalysisResult } from '../analyze/types.js';

/***
 * Serializable model consumed by renderers and writers.
 */
export interface DocumentationModel {
  packageName: string;
  packageId: string;
  description: string | null;
  exports: {
    name: string;
    description: string | null;
    kind: string;
  }[];
  components: AnalysisComponent[];
  usage: {
    command: string;
  } | null;
  config: {
    exportName: string;
    configFile: string;
    factoryName: string | null;
  } | null;
}

export type SerializableAnalysisResult = Omit<AnalysisResult, 'exports'> & {
  exports: DocumentationModel['exports'];
};
