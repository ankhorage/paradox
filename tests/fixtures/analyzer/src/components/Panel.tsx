import type { PanelProps } from './PanelProps.js';

/***
 * Panel layout component.
 *
 * @readme
 */
export function Panel({ title, tone = 'info' }: PanelProps) {
  return <section data-tone={tone}>{title}</section>;
}
