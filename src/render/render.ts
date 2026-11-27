import type { DocumentationModel } from '../model/types.js';
import type { Contributor } from '../types/contributors.js';
import type { RenderContext, RenderResult } from '../types/render.js';
import { renderBadgeArtifacts } from './renderers/badges.js';
import { renderCollaborators } from './renderers/collaborators.js';
import { renderDiagramArtifacts } from './renderers/diagrams.js';
import { renderDonation } from './renderers/donation.js';
import { renderFundingYaml } from './renderers/funding.js';
import { renderHtml } from './renderers/html.js';
import { renderMarkdown } from './renderers/markdown.js';

/***
 * Renders the documentation model into README and artifact files.
 */
export function render(
  model: DocumentationModel,
  options: {
    outputDir?: string;
    contributors?: readonly Contributor[];
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
    fundingYaml: renderFundingYaml(model),
    badges,
    diagrams,
  };
  const context: RenderContext = {
    model,
    contributors: options.contributors ?? [],
    outputDir,
    badges,
    diagrams,
    result,
  };

  for (const renderer of [renderMarkdown, renderHtml]) {
    Object.assign(result, renderer(context));
  }
  Object.assign(result, renderCollaborators(context));
  Object.assign(result, renderDonation(context));

  return result;
}
