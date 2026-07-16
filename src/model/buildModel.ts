import type { ComponentModel, DocumentationModel, ExportKind, ExportModel } from './types.js';

interface ExampleInput {
  title: string | null;
  language: string | null;
  code: string;
}

interface ExportMemberInput {
  name: string;
  kind: 'property' | 'method';
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: ExportMemberInput[];
}

interface ConfigMemberInput {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: ConfigMemberInput[];
}

interface BuildModelInput {
  packageName: string;
  packageId: string;
  description: string | null;
  badges: {
    id: string;
    label: string;
    value: string;
    color: string;
  }[];
  exports: {
    name: string;
    description: string | null;
    isReadme: boolean;
    examples: ExampleInput[];
    kind: ExportKind;
    modulePath: string;
    sourceLocation: {
      filePath: string;
      line: number;
      column: number;
    };
    exportPaths: string[];
    relatedSymbols: string[];
    signatures: {
      label: string;
      parameters: {
        name: string;
        type: string;
        required: boolean;
        description: string | null;
      }[];
      returnType: string | null;
      returnDescription: string | null;
    }[];
    members: ExportMemberInput[];
    structuredRows: { values: Record<string, string> }[];
  }[];
  components: {
    name: string;
    description: string | null;
    isReadme: boolean;
    examples: ExampleInput[];
    modulePath: string;
    sourceLocation: {
      filePath: string;
      line: number;
      column: number;
    };
    exportPaths: string[];
    props: {
      name: string;
      type: string;
      required: boolean;
      defaultValue?: string;
      description: string | null;
    }[];
  }[];
  sourceFunctions: {
    name: string;
    description: string | null;
    sourceLocation: {
      filePath: string;
      line: number;
      column: number;
    };
  }[];
  sequenceScenarios: {
    kind: 'bin' | 'export';
    name: string;
    sourcePath: string;
    symbolName: string;
    description: string | null;
    isReadme: boolean;
  }[];
  usage: {
    packageName: string;
    commands: {
      name: string;
      command: string;
    }[];
  } | null;
  readmeUsageDescription: string | null;
  readmeUsage: {
    title: string | null;
    description: string | null;
    language: string;
    code: string;
    sourcePath: string;
  }[];
  readmeCli: {
    description: string | null;
    sourcePath: string;
  } | null;
  readmeConfig: {
    description: string | null;
    language: string;
    code: string;
    sourcePath: string;
  } | null;
  config: {
    exportName: string;
    isReadme: boolean;
    members: ConfigMemberInput[];
  } | null;
  entrypoints: string[];
  modules: {
    path: string;
    isEntrypoint: boolean;
    dependencies: string[];
    exports: string[];
  }[];
  graphs: {
    imports: {
      fromPath: string;
      toPath: string;
      sourcePath: string;
    }[];
    calls: {
      fromSymbol: string;
      toSymbol: string;
      callExpression: string;
      sourcePath: string;
    }[];
    typeReferences: {
      fromSymbol: string;
      toType: string;
      sourcePath: string;
    }[];
    componentComposition: {
      fromComponent: string;
      toComponent: string;
      jsxElement: string;
      sourcePath: string;
    }[];
  };
}

/***
 * Converts analysis output into a serializable documentation model.
 */
export function buildModel(analysis: BuildModelInput): DocumentationModel {
  const exportNames = new Set(analysis.exports.map((item) => item.name));
  const exportsByName = new Map(
    analysis.exports.map((item) => [item.name, mapExport(item, exportNames)]),
  );
  const exports = sortByName([...exportsByName.values()]);

  return {
    packageName: analysis.packageName,
    packageId: analysis.packageId,
    description: analysis.description,
    badges: analysis.badges.map((badge) => ({
      id: badge.id,
      label: badge.label,
      value: badge.value,
      color: badge.color,
    })),
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
    readmeUsageDescription: analysis.readmeUsageDescription,
    readmeUsage: analysis.readmeUsage
      .map((usageEntry) => ({
        title: usageEntry.title,
        description: usageEntry.description,
        language: usageEntry.language,
        code: usageEntry.code,
        sourcePath: usageEntry.sourcePath,
      }))
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
    readmeCli:
      analysis.readmeCli !== null
        ? {
            description: analysis.readmeCli.description,
            sourcePath: analysis.readmeCli.sourcePath,
          }
        : null,
    readmeConfig:
      analysis.readmeConfig !== null
        ? {
            description: analysis.readmeConfig.description,
            language: analysis.readmeConfig.language,
            code: analysis.readmeConfig.code,
            sourcePath: analysis.readmeConfig.sourcePath,
          }
        : null,
    config:
      analysis.config !== null
        ? {
            exportName: analysis.config.exportName,
            isReadme: analysis.config.isReadme,
            members: analysis.config.members,
          }
        : null,
    entrypoints: [...analysis.entrypoints].sort((a, b) => a.localeCompare(b)),
    modules: [...analysis.modules]
      .map((module) => ({
        path: module.path,
        isEntrypoint: module.isEntrypoint,
        dependencies: [...module.dependencies].sort((a, b) => a.localeCompare(b)),
        exports: [...module.exports].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    exports,
    components: sortByName(
      analysis.components.map((component) =>
        mapComponent(component, exportsByName.get(component.name)),
      ),
    ),
    sourceFunctions: analysis.sourceFunctions.map((sourceFunction) => ({
      name: sourceFunction.name,
      description: sourceFunction.description,
      sourceLocation: {
        filePath: sourceFunction.sourceLocation.filePath,
        line: sourceFunction.sourceLocation.line,
        column: sourceFunction.sourceLocation.column,
      },
    })),
    sequenceScenarios: sortByName(
      analysis.sequenceScenarios.map((scenario) => ({
        kind: scenario.kind,
        name: scenario.name,
        sourcePath: scenario.sourcePath,
        symbolName: scenario.symbolName,
        description: scenario.description,
        isReadme: scenario.isReadme,
      })),
    ),
    graphs: {
      imports: [...analysis.graphs.imports],
      calls: [...analysis.graphs.calls],
      typeReferences: [...analysis.graphs.typeReferences],
      componentComposition: [...analysis.graphs.componentComposition],
    },
  };
}

/***
 * Maps one analyzed export into the serializable documentation shape.
 */
function mapExport(
  item: BuildModelInput['exports'][number],
  exportNames: ReadonlySet<string>,
): ExportModel {
  return {
    name: item.name,
    description: item.description,
    isReadme: item.isReadme,
    examples: item.examples.map((example) => ({ ...example })),
    kind: item.kind,
    modulePath: item.modulePath,
    sourceLocation: {
      filePath: item.sourceLocation.filePath,
      line: item.sourceLocation.line,
      column: item.sourceLocation.column,
    },
    exportPaths: [...item.exportPaths].sort((a, b) => a.localeCompare(b)),
    relatedSymbols: item.relatedSymbols
      .filter((symbol) => exportNames.has(symbol))
      .sort((a, b) => a.localeCompare(b)),
    signatures: item.signatures.map((signature) => ({
      label: signature.label,
      parameters: sortByName(
        signature.parameters.map((parameter) => ({
          name: parameter.name,
          type: parameter.type,
          required: parameter.required,
          description: parameter.description,
        })),
      ),
      returnType: signature.returnType,
      returnDescription: signature.returnDescription,
    })),
    members: sortByName(
      item.members.map((member) => ({
        name: member.name,
        kind: member.kind,
        type: member.type,
        required: member.required,
        description: member.description,
        defaultValue: member.defaultValue,
        inheritedFrom: member.inheritedFrom,
        children: member.children,
      })),
    ),
    structuredRows: item.structuredRows.map((row) => ({ values: { ...row.values } })),
  };
}

/***
 * Maps an analyzed component while preserving export metadata when available.
 */
function mapComponent(
  component: BuildModelInput['components'][number],
  exportModel: ExportModel | undefined,
): ComponentModel {
  return {
    name: component.name,
    description: component.description,
    isReadme: component.isReadme,
    examples: component.examples.map((example) => ({ ...example })),
    modulePath: component.modulePath,
    sourceLocation: {
      filePath: component.sourceLocation.filePath,
      line: component.sourceLocation.line,
      column: component.sourceLocation.column,
    },
    exportPaths:
      exportModel?.exportPaths ?? [...component.exportPaths].sort((a, b) => a.localeCompare(b)),
    props: sortByName(
      component.props.map((prop) => ({
        name: prop.name,
        type: prop.type,
        required: prop.required,
        defaultValue: prop.defaultValue,
        description: prop.description,
      })),
    ),
  };
}

/***
 * Returns a copy of items sorted by their `name` property.
 */
function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
