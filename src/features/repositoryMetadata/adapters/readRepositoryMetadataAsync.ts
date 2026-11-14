import type { Stats } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { RepositoryMetadata } from '@ankhorage/contracts/metadata';
import {
  evaluateRepositoryMetadataPreflight,
  REPOSITORY_RULE_METADATA,
  type RepositoryMetadataFact,
} from '@ankhorage/rules-repository';

import { parseRepositoryMetadata } from '../domain/parseRepositoryMetadata.js';

/***
 * Reads optional canonical repository metadata and rejects an invalid present document.
 */
export async function readRepositoryMetadataAsync(
  root: string,
): Promise<RepositoryMetadata | null> {
  const profile = (await directoryExistsAsync(join(root, 'src'))) ? 'source' : 'non-source';
  const path =
    profile === 'source'
      ? REPOSITORY_RULE_METADATA.metadata.profiles.source.canonicalPath
      : REPOSITORY_RULE_METADATA.metadata.profiles.nonSource.canonicalPath;
  const absolutePath = join(root, path);
  if (!(await fileExistsAsync(absolutePath))) return null;

  try {
    const document = parseRepositoryMetadata(JSON.parse(await readFile(absolutePath, 'utf8')));
    assertValidMetadata({ document, eligibility: 'applicable', managed: true, path, profile });
    return document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to use repository metadata at ${path}: ${message}`, {
      cause: error,
    });
  }
}

/*** Applies the published report-only metadata policy to one structurally decoded document. */
function assertValidMetadata(metadata: RepositoryMetadataFact): void {
  const evaluation = evaluateRepositoryMetadataPreflight({
    cliCommands: [],
    imports: [],
    metadata,
    packageJson: { dependencies: [], exports: [], fields: {}, scripts: {} },
    paths: [],
    workflowBunVersions: {},
  });
  const details = [
    ...evaluation.diagnostics.map(({ code, message }) => `[${code}] ${message}`),
    ...evaluation.findings.map(
      ({ message, ruleId, subjects }) =>
        `[${ruleId}] ${subjects[0]?.path ?? metadata.path ?? 'repository metadata'}: ${message}`,
    ),
  ];
  if (details.length > 0) {
    throw new Error(`Repository metadata policy failed:\n- ${details.join('\n- ')}`);
  }
}

/*** Returns whether a path exists as a regular file. */
async function fileExistsAsync(path: string): Promise<boolean> {
  return await pathMatchesAsync(path, (entry) => entry.isFile());
}

/*** Returns whether a path exists as a directory. */
async function directoryExistsAsync(path: string): Promise<boolean> {
  return await pathMatchesAsync(path, (entry) => entry.isDirectory());
}

/*** Checks a local path without hiding filesystem failures other than absence. */
async function pathMatchesAsync(
  path: string,
  predicate: (entry: Stats) => boolean,
): Promise<boolean> {
  try {
    return predicate(await stat(path));
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

/*** Identifies the only filesystem error that represents optional absence. */
function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
