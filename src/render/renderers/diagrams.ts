import type { DocumentationModel, ModuleModel, SequenceScenarioModel } from '../../model/types.js';
import type { DiagramArtifact } from '../types.js';

const MAX_SEQUENCE_CALL_EDGES = 12;
const MAX_SEQUENCE_PARTICIPANTS = 8;

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
    ...renderSequenceArtifacts(model),
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

function renderSequenceArtifacts(model: DocumentationModel): DiagramArtifact[] {
  return model.sequenceScenarios.flatMap((scenario) => {
    const content = renderSequenceScenario(model, scenario);
    if (content === null) return [];

    return [
      {
        path: `diagrams/sequences/${toFileStem(scenario.name)}.mmd`,
        title: `${scenario.name} sequence`,
        content,
      },
    ];
  });
}

function renderSequenceScenario(
  model: DocumentationModel,
  scenario: SequenceScenarioModel,
): string | null {
  const lines = ['sequenceDiagram'];
  const reachableEdges = collectReachableCallEdges(model.graphs.calls, scenario.symbolName);
  const participants = collectSequenceParticipants(reachableEdges);

  if (reachableEdges.length === 0) return null;

  if (
    reachableEdges.length > MAX_SEQUENCE_CALL_EDGES ||
    participants.length > MAX_SEQUENCE_PARTICIPANTS
  ) {
    return null;
  }

  for (const participant of participants) {
    lines.push(
      `  participant ${toMermaidId(`participant-${participant}`)} as ${escapeLabel(participant)}`,
    );
  }

  renderCallFlow(lines, reachableEdges, scenario.symbolName);

  return `${lines.join('\n')}\n`;
}

function collectReachableCallEdges(
  callEdges: DocumentationModel['graphs']['calls'],
  root: string,
): DocumentationModel['graphs']['calls'] {
  const outgoing = groupCallsBySource(callEdges);
  const visited = new Set<string>();
  const ordered: DocumentationModel['graphs']['calls'] = [];

  visitCallEdges(root, outgoing, visited, ordered);

  return ordered;
}

function visitCallEdges(
  fromSymbol: string,
  outgoing: ReadonlyMap<string, DocumentationModel['graphs']['calls']>,
  visited: Set<string>,
  ordered: DocumentationModel['graphs']['calls'],
): void {
  for (const edge of outgoing.get(fromSymbol) ?? []) {
    const key = getCallEdgeKey(edge);
    if (visited.has(key)) continue;
    visited.add(key);
    ordered.push(edge);
    visitCallEdges(edge.toSymbol, outgoing, visited, ordered);
  }
}

function renderCallFlow(
  lines: string[],
  callEdges: DocumentationModel['graphs']['calls'],
  root: string,
): void {
  const outgoing = groupCallsBySource(callEdges);
  const visited = new Set<string>();

  renderNestedCalls(lines, root, outgoing, visited);
}

function renderNestedCalls(
  lines: string[],
  fromSymbol: string,
  outgoing: ReadonlyMap<string, DocumentationModel['graphs']['calls']>,
  visited: Set<string>,
): void {
  for (const edge of outgoing.get(fromSymbol) ?? []) {
    const key = getCallEdgeKey(edge);
    if (visited.has(key)) continue;
    visited.add(key);

    const fromId = toMermaidId(`participant-${edge.fromSymbol}`);
    const toId = toMermaidId(`participant-${edge.toSymbol}`);
    lines.push(`  ${fromId}->>${toId}: ${formatCallLabel(edge.callExpression)}`);
    renderNestedCalls(lines, edge.toSymbol, outgoing, visited);
    lines.push(`  ${toId}-->>${fromId}: return`);
  }
}

function groupCallsBySource(
  callEdges: DocumentationModel['graphs']['calls'],
): Map<string, DocumentationModel['graphs']['calls']> {
  const grouped = new Map<string, DocumentationModel['graphs']['calls']>();

  for (const edge of callEdges) {
    const existing = grouped.get(edge.fromSymbol) ?? [];
    existing.push(edge);
    grouped.set(edge.fromSymbol, existing);
  }

  return grouped;
}

function collectSequenceParticipants(callEdges: DocumentationModel['graphs']['calls']): string[] {
  return uniqueSorted(callEdges.flatMap((edge) => [edge.fromSymbol, edge.toSymbol]));
}

function getCallEdgeKey(edge: DocumentationModel['graphs']['calls'][number]): string {
  return `${edge.fromSymbol}->${edge.toSymbol}@${edge.sourcePath}:${edge.callExpression}`;
}

function formatCallLabel(callExpression: string): string {
  return callExpression.endsWith(')') ? callExpression : `${callExpression}()`;
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

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toFileStem(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toMermaidId(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, '_');
}

function escapeLabel(value: string): string {
  return value.replaceAll('"', '&quot;');
}
