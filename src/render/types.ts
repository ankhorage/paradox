/***
 * Rendered documentation files ready to be written to disk.
 */
export interface RenderResult {
  readme: string;
  exportsMarkdown: string;
  components: string;
  exportsJson: string;
  paradoxJson: string;
}
