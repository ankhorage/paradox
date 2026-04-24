import type { ComponentModel, DocumentationModel, ExportKind, ExportModel } from './types.js';

interface BuildModelInput {
  packageName: string;
  packageId: string;
  description: string | null;
  exports: {
    name: string;
    description: string | null;
    kind: ExportKind;
  }[];
  components: {
    name: string;
    description: string | null;
    props: {
      name: string;
      type: string;
      required: boolean;
      description: string | null;
    }[];
  }[];
  usage: {
    packageName: string;
    commands: {
      name: string;
      command: string;
    }[];
  } | null;
  config: {
    exportName: string;
  } | null;
}

/***
 * Converts analysis output into a serializable documentation model.
 */
export function buildModel(analysis: BuildModelInput): DocumentationModel {
  const exportsByName = new Map(analysis.exports.map((item) => [item.name, mapExport(item)]));
  const exports = sortByName([...exportsByName.values()]);

  return {
    packageName: analysis.packageName,
    packageId: analysis.packageId,
    description: analysis.description,
    usage:
      analysis.usage !== null
        ? {
            packageName: analysis.usage.packageName,
            commands: sortByName(
              analysis.usage.commands.map((command) => ({
                name: command.name,
                command: command.command,
              })),
            ),
          }
        : null,
    config:
      analysis.config !== null
        ? {
            exportName: analysis.config.exportName,
            configFile: getDefaultConfigFileName(analysis.packageId),
            factoryName: findConfigFactoryName(analysis.config.exportName, [
              ...exportsByName.keys(),
            ]),
          }
        : null,
    exports,
    components: sortByName(analysis.components.map(mapComponent)),
  };
}

function mapExport(item: BuildModelInput['exports'][number]): ExportModel {
  return {
    name: item.name,
    description: item.description,
    kind: item.kind,
  };
}

function mapComponent(component: BuildModelInput['components'][number]): ComponentModel {
  return {
    name: component.name,
    description: component.description,
    props: sortByName(
      component.props.map((prop) => ({
        name: prop.name,
        type: prop.type,
        required: prop.required,
        description: prop.description,
      })),
    ),
  };
}

function findConfigFactoryName(configExportName: string, exportNames: string[]): string | null {
  const prefix = configExportName.endsWith('Config')
    ? configExportName.slice(0, -'Config'.length)
    : configExportName;
  const expectedFactoryName = `define${prefix}Config`;

  return exportNames.includes(expectedFactoryName) ? expectedFactoryName : null;
}

function getDefaultConfigFileName(packageId: string): string {
  const packageBaseName = packageId.split('/').pop() ?? packageId;

  return `${packageBaseName}.config.ts`;
}

function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
