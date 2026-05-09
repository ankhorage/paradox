import type { DocumentationModel, ModuleModel } from '../../model/types.js';
import type { DiagramArtifact } from '../types.js';

/***
 * Generates deterministic Mermaid diagrams for the documentation app.
 */
export function renderDiagramArtifacts(model: DocumentationModel): DiagramArtifact[] {
  return [
    {
      path: 'diagrams/architecture-overview.mmd',
      title: 'Architecture overview',
      content: renderArchitectureOverview(model),
    },
    {
      path: 'diagrams/module-relationships.mmd',
      title: 'Module relationships',
      content: renderModuleRelationships(model),
    },
    {
      path: 'diagrams/export-graph.mmd',
      title: 'Export graph',
      content: renderExportGraph(model),
    },
    {
      path: 'diagrams/entrypoint-sequence.mmd',
      title: 'Entrypoint sequence',
      content: renderEntrypointSequence(model),
    },
  ];
}

function renderArchitectureOverview(model: DocumentationModel): string {
  const lines = ['graph TD'];
  const packageId = toMermaidId(`package-${model.packageId}`);

  lines.push(`  ${packageId}["${escapeLabel(model.packageName)}"]`);

  for (const entrypoint of model.entrypoints) {
    const entrypointId = toMermaidId(`entrypoint-${entrypoint}`);
    lines.push(`  ${entrypointId}["${escapeLabel(entrypoint)}"]`);
    lines.push(`  ${packageId} --> ${entrypointId}`);
  }

  for (const module of model.modules) {
    const moduleId = toMermaidId(`module-${module.path}`);
    lines.push(`  ${moduleId}["${escapeLabel(module.path)}"]`);

    if (!module.isEntrypoint) {
      lines.push(`  ${packageId} -.-> ${moduleId}`);
    }

    for (const dependency of module.dependencies) {
      lines.push(`  ${moduleId} --> ${toMermaidId(`module-${dependency}`)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderModuleRelationships(model: DocumentationModel): string {
  const lines = ['graph LR'];

  for (const module of model.modules) {
    lines.push(`  ${toMermaidId(`module-${module.path}`)}["${escapeLabel(module.path)}"]`);
  }

  const edges = model.modules.flatMap((module) =>
    module.dependencies.map(
      (dependency) =>
        `  ${toMermaidId(`module-${module.path}`)} --> ${toMermaidId(`module-${dependency}`)}`,
    ),
  );

  lines.push(...(edges.length > 0 ? edges : renderFallbackEdge(model.modules, 'module')));

  return `${lines.join('\n')}\n`;
}

function renderExportGraph(model: DocumentationModel): string {
  const lines = ['graph LR'];
  const exportedNames = new Set(model.exports.map((item) => item.name));

  for (const module of model.modules) {
    lines.push(`  ${toMermaidId(`module-${module.path}`)}["${escapeLabel(module.path)}"]`);
  }

  for (const item of model.exports) {
    const exportId = toMermaidId(`export-${item.name}`);
    lines.push(`  ${exportId}["${escapeLabel(item.name)}"]`);
    lines.push(`  ${toMermaidId(`module-${item.modulePath}`)} --> ${exportId}`);

    for (const relatedSymbol of item.relatedSymbols.filter((symbol) => exportedNames.has(symbol))) {
      lines.push(`  ${exportId} -.-> ${toMermaidId(`export-${relatedSymbol}`)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderEntrypointSequence(model: DocumentationModel): string {
  const lines = ['sequenceDiagram'];
  const participants = new Map<string, string>();

  for (const module of model.modules) {
    participants.set(
      module.path,
      `participant ${toMermaidId(`participant-${module.path}`)} as ${module.path}`,
    );
  }

  lines.push(...participants.values());

  const interactions = model.modules.flatMap((module) =>
    module.dependencies.map(
      (dependency) =>
        `  ${toMermaidId(`participant-${module.path}`)}->>${toMermaidId(
          `participant-${dependency}`,
        )}: imports`,
    ),
  );

  if (interactions.length === 0) {
    const packageId = toMermaidId(`participant-${model.packageId}`);
    lines.push(`  participant ${packageId} as ${model.packageName}`);
    lines.push(`  Note over ${packageId}: No internal module relationships detected.`);
  } else {
    lines.push(...interactions);
  }

  return `${lines.join('\n')}\n`;
}

function renderFallbackEdge(modules: readonly ModuleModel[], prefix: string): string[] {
  if (modules.length === 0) {
    return ['  empty["No modules analyzed"]'];
  }

  return modules.slice(1).map((module, index) => {
    const previous = modules[index];
    return `  ${toMermaidId(`${prefix}-${previous.path}`)} -.-> ${toMermaidId(`${prefix}-${module.path}`)}`;
  });
}

function toMermaidId(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, '_');
}

function escapeLabel(value: string): string {
  return value.replaceAll('"', '&quot;');
}
