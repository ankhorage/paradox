import type { AnalysisComponent, AnalysisResult } from '../analyze/types.js';

/***
 * Serializable model consumed by renderers and writers.
 */
export interface DocumentationModel {
  packageName: string;
  description: string | null;
  exports: {
    name: string;
    description: string | null;
    kind: string;
  }[];
  components: AnalysisComponent[];
}

export type SerializableAnalysisResult = Omit<AnalysisResult, 'exports'> & {
  exports: DocumentationModel['exports'];
};
