import type { AnalysisUsage } from './types.js';

export interface PackageJsonModel {
  name: string;
  description?: string;
  bin?: string | Record<string, string>;
}

export function createUsageFromPackageJson(pkg: PackageJsonModel): AnalysisUsage | null {
  if (pkg.bin == null) return null;

  if (typeof pkg.bin === 'string') {
    return {
      packageName: pkg.name,
      commands: [
        {
          name: getPackageBaseName(pkg.name),
          command: `bunx ${pkg.name}`,
        },
      ],
    };
  }

  const entries = Object.keys(pkg.bin).sort((a, b) => a.localeCompare(b));

  if (entries.length === 0) return null;

  if (entries.length === 1) {
    const [name] = entries;

    return {
      packageName: pkg.name,
      commands: [
        {
          name,
          command: `bunx ${pkg.name}`,
        },
      ],
    };
  }

  return {
    packageName: pkg.name,
    commands: entries.map((name) => ({
      name,
      command: `bunx ${pkg.name} ${name}`,
    })),
  };
}

function getPackageBaseName(packageName: string): string {
  return packageName.split('/').pop() ?? packageName;
}
