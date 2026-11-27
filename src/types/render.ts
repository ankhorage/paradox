import type { DocumentationModel } from '../model/types.js';
import type { Contributor } from './contributors.js';

/***
 * Rendered documentation files ready to be written to disk.
 */
export interface DiagramArtifact {
  path: string;
  title: string;
  content: string;
}

export interface BadgeArtifact {
  path: string;
  content: string;
}

export interface RenderResult {
  readme: string;
  exportsMarkdown: string;
  components: string;
  exportsJson: string;
  paradoxJson: string;
  indexHtml: string;
  fundingYaml: string | null;
  diagrams: DiagramArtifact[];
  badges: BadgeArtifact[];
}

export interface RenderContext {
  model: DocumentationModel;
  contributors: readonly Contributor[];
  outputDir: string;
  diagrams: DiagramArtifact[];
  badges: BadgeArtifact[];
  result: RenderResult;
}
