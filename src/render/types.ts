import type { DocumentationModel } from '../model/types.js';

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
  diagrams: DiagramArtifact[];
  badges: BadgeArtifact[];
}

export interface RenderContext {
  model: DocumentationModel;
  outputDir: string;
  diagrams: DiagramArtifact[];
  badges: BadgeArtifact[];
  result: RenderResult;
}
