import { normalize, relative } from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';
export function relativeToRoot(root: string, filePath: string): string {
  return toPortablePath(relative(root, filePath));
}

export function isPathInsideRoot(root: string, filePath: string): boolean {
  return normalize(filePath).startsWith(normalize(root));
}

export function isNodeModulePath(filePath: string): boolean {
  return toPortablePath(filePath).includes('/node_modules/');
}
