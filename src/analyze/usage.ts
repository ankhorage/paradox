import type { AnalysisUsage } from './types.js';

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
 * Builds the canonical Ankh package help command from package metadata.
 */
export function createUsageFromPackageJson(pkg: PackageJsonModel): AnalysisUsage {
  const packageName = getPackageBaseName(pkg.name);

  return {
    packageName: pkg.name,
    command: `ankh ${packageName} --help`,
  };
}

/***
 * Extracts the unscoped package name from a package id.
 */
function getPackageBaseName(packageName: string): string {
  return packageName.split('/').pop() ?? packageName;
}
