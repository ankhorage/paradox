import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
  parseProductDocumentation,
  type ProductDocumentation,
} from '../domain/parseProductDocumentation.js';

/***
 * Reads and validates a product documentation source owned by the analyzed repository.
 */
export async function readProductDocumentationAsync(
  root: string,
  sourcePath: string | undefined,
  repositoryKind: string | undefined,
): Promise<ProductDocumentation | null> {
  if (sourcePath === undefined) return null;
  const path = resolveProductDocumentationPath(root, sourcePath);

  try {
    const document = parseProductDocumentation(JSON.parse(await readFile(path, 'utf8')));
    if (repositoryKind !== undefined && document.kind !== repositoryKind) {
      throw new Error(
        `kind "${document.kind}" does not match repository metadata kind "${repositoryKind}"`,
      );
    }
    return document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to use product documentation at ${sourcePath}: ${message}`, {
      cause: error,
    });
  }
}

/*** Resolves a source path while keeping product documentation inside its repository. */
function resolveProductDocumentationPath(root: string, sourcePath: string): string {
  if (sourcePath.trim().length === 0 || isAbsolute(sourcePath)) {
    throw new Error(
      'Product documentation source must be a non-empty relative path inside the package root.',
    );
  }
  const path = resolve(root, sourcePath);
  const rel = relative(root, path);
  if (rel === '..' || rel.startsWith(`..${sep}`)) {
    throw new Error('Product documentation source must stay inside the package root.');
  }
  return path;
}
