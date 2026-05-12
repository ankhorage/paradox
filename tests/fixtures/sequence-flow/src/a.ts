import { getMe } from './b.js';
import './unused.js';

/***
 * Runs the root sequence action.
 */
export function runA(): string {
  return getMe();
}
