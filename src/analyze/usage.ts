import { resolve } from 'node:path';

import { discoverAnkhPackages, loadProviderManifests } from '@ankhorage/ankh';

import type { AnalysisUsage } from '../types/analysis.js';

export interface PackageJsonModel {
  name: string;
  description?: string;
  version?: string;
  license?: string;
  packageManager?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  eslintConfig?: unknown;
  prettier?: unknown;
}

/***
 * Resolves the canonical Ankh package help command from a valid provider manifest.
 */
export async function createUsageFromPackageJson(
  pkg: PackageJsonModel,
  packageRoot: string,
): Promise<AnalysisUsage> {
  const discovery = await discoverAnkhPackages({ cwd: packageRoot });
  const normalizedPackageRoot = resolve(packageRoot);
  throwForDiscoveryErrors(discovery.diagnostics, normalizedPackageRoot);
  const discoveredPackage = discovery.packages.find(
    (item) => resolve(item.packageRoot) === normalizedPackageRoot,
  );

  if (discoveredPackage === undefined) {
    return { packageName: pkg.name, command: null };
  }

  // Ankh validates a provider by importing its declared module. Restrict that executable boundary
  // to the package being documented: discovery may list dependencies, but their providers are never run.
  const providerResult = await loadProviderManifests([discoveredPackage]);
  throwForProviderErrors(providerResult.diagnostics);
  const provider = providerResult.providers.find(
    (candidate) => candidate.manifest.commands.length > 0,
  );

  return {
    packageName: pkg.name,
    command: provider === undefined ? null : `ankh ${provider.manifest.category} --help`,
  };
}

/***
 * Throws the canonical Ankh diagnostics that prevent discovery of the documented package.
 */
function throwForDiscoveryErrors(
  diagnostics: readonly {
    packageJsonPath?: string;
    severity: 'warning' | 'error';
    code: string;
    message: string;
  }[],
  packageRoot: string,
): void {
  const packageJsonPath = resolve(packageRoot, 'package.json');
  const errors = diagnostics.filter(
    (diagnostic) =>
      diagnostic.severity === 'error' &&
      diagnostic.packageJsonPath !== undefined &&
      resolve(diagnostic.packageJsonPath) === packageJsonPath,
  );
  if (errors.length > 0) throw new Error(renderAnkhDiagnostics(errors));
}

/***
 * Throws the canonical Ankh diagnostics that prevent loading a declared provider manifest.
 */
function throwForProviderErrors(
  diagnostics: readonly { severity: 'warning' | 'error'; code: string; message: string }[],
): void {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0) throw new Error(renderAnkhDiagnostics(errors));
}

/***
 * Formats provider failures with the Ankh diagnostic heading used by its CLI boundary.
 */
function renderAnkhDiagnostics(
  diagnostics: readonly { severity: 'warning' | 'error'; code: string; message: string }[],
): string {
  return [
    'Ankh provider manifest diagnostics:',
    '',
    ...diagnostics.map(
      (diagnostic) => `  [${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`,
    ),
  ].join('\n');
}
