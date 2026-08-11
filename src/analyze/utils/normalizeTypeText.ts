/***
 * Removes machine-specific absolute paths from TypeScript import type text.
 */
export function normalizeTypeText(typeText: string, packageRoot?: string): string {
  let normalized = '';
  let cursor = 0;

  for (const match of typeText.matchAll(/import\((['"])([^'"]+)\1\)/g)) {
    const [fullMatch, quote, importPath] = match;
    normalized += typeText.slice(cursor, match.index);
    normalized += `import(${quote}${normalizeImportPath(importPath, packageRoot)}${quote})`;
    cursor = match.index + fullMatch.length;
  }

  return normalized + typeText.slice(cursor);
}

function normalizeImportPath(importPath: string, packageRoot?: string): string {
  const normalizedPath = toPosixPath(importPath);
  const nodeModulesMarker = '/node_modules/';
  const nodeModulesIndex = normalizedPath.lastIndexOf(nodeModulesMarker);
  if (nodeModulesIndex >= 0) {
    return normalizedPath.slice(nodeModulesIndex + nodeModulesMarker.length);
  }
  if (normalizedPath.startsWith('node_modules/')) {
    return normalizedPath.slice('node_modules/'.length);
  }

  const normalizedRoot = packageRoot ? toPosixPath(packageRoot).replace(/\/$/, '') : null;
  if (normalizedRoot && normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return `./${normalizedPath.slice(normalizedRoot.length + 1)}`;
  }

  return normalizedPath;
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
