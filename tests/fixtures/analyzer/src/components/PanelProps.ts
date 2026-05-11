import type { ReactNode } from '../react.js';

/***
 * Shared panel properties.
 */
export interface PanelProps {
  /*** Panel title. */
  title: ReactNode;

  /*** Tone for the panel header. */
  tone?: 'info' | 'warning';
}
