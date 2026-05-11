import type { BoxProps } from './index.js';

/***
 * Simple layout box.
 */
export function Box({ children }: BoxProps) {
  return <div>{children}</div>;
}
