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
  const packageName = getPackageBaseName(pkg.name);
  const discovery = await discoverAnkhPackages({ cwd: packageRoot });
  const discoveredPackage = discovery.packages.find((item) => item.packageRoot === packageRoot);

  if (discoveredPackage === undefined) {
    return { packageName: pkg.name, command: null };
  }

  const { providers } = await loadProviderManifests([discoveredPackage]);
  const hasCommands = providers.some((provider) => provider.manifest.commands.length > 0);

  return {
    packageName: pkg.name,
    command: hasCommands ? `ankh ${packageName} --help` : null,
  };
}

/***
 * Extracts the unscoped package name from a package id.
 */
function getPackageBaseName(packageName: string): string {
  return packageName.split('/').pop() ?? packageName;
}
