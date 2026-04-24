import type { AnalysisResult } from '../analyze/types.js';
import type { DocumentationModel } from './types.js';

/***
 * Converts analysis output into a serializable documentation model.
 */
export function buildModel(analysis: AnalysisResult): DocumentationModel {
  const exportsByName = new Map(
    analysis.exports.map((item) => [
      item.name,
      {
        name: item.name,
        description: item.description,
        kind: item.kind,
      },
    ]),
  );

  return {
    packageName: analysis.packageName,
    description: analysis.description,
    exports: [...exportsByName.values()],
    components: analysis.components,
  };
}
