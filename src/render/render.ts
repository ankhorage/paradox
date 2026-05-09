import type { DocumentationModel } from '../model/types.js';
import { renderBadgeArtifacts } from './renderers/badges.js';
import { renderDiagramArtifacts } from './renderers/diagrams.js';
import { renderHtml } from './renderers/html.js';
import { renderMarkdown } from './renderers/markdown.js';
import type { RenderContext, RenderResult } from './types.js';

/***
 * Renders the documentation model into README and artifact files.
 */
export function render(
  model: DocumentationModel,
  options: {
    outputDir?: string;
  } = {},
): RenderResult {
  const badges = renderBadgeArtifacts(model);
  const diagrams = renderDiagramArtifacts(model);
  const outputDir = options.outputDir ?? 'paradox';
  const result: RenderResult = {
    readme: '',
    exportsMarkdown: '',
    components: '',
    exportsJson: `${JSON.stringify(model.exports, null, 2)}\n`,
    paradoxJson: `${JSON.stringify(model, null, 2)}\n`,
    indexHtml: '',
    badges,
    diagrams,
  };
  const context: RenderContext = {
    model,
    outputDir,
    badges,
    diagrams,
    result,
  };

  for (const renderer of [renderMarkdown, renderHtml]) {
    Object.assign(result, renderer(context));
  }

  return result;
}
