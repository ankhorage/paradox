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
    packageId: analysis.packageId,
    description: analysis.description,
    exports: [...exportsByName.values()],
    components: analysis.components,
    usage: analysis.usage,
    config:
      analysis.config !== null
        ? {
            exportName: analysis.config.exportName,
            configFile: `${analysis.packageId.split('/').pop()}.config.ts`,
            factoryName: findConfigFactoryName(analysis.config.exportName, [
              ...exportsByName.keys(),
            ]),
          }
        : null,
  };
}

function findConfigFactoryName(configExportName: string, exportNames: string[]): string | null {
  const prefix = configExportName.endsWith('Config')
    ? configExportName.slice(0, -'Config'.length)
    : configExportName;
  const expectedFactoryName = `define${prefix}Config`;

  return exportNames.includes(expectedFactoryName) ? expectedFactoryName : null;
}
