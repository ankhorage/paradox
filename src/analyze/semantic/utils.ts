import { normalize, relative } from 'node:path';

export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

export function relativeToRoot(root: string, filePath: string): string {
  return toPosixPath(relative(root, filePath));
}

export function isPathInsideRoot(root: string, filePath: string): boolean {
  return normalize(filePath).startsWith(normalize(root));
}

export function isNodeModulePath(filePath: string): boolean {
  return toPosixPath(filePath).includes('/node_modules/');
}
