import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isRecord } from '@ankhorage/utility/object';

import type { Contributor } from '../../../types/contributors.js';

/***
 * Reads real GitHub contributors for the declared package repository.
 * Missing or non-GitHub repository metadata is not a contributor source.
 * Provider failures stop generation instead of publishing an empty snapshot.
 */
export async function readGitHubContributorsAsync(
  packageRoot: string,
  options: {
    token?: string;
    fetchPage?: (url: string, init: RequestInit) => Promise<Response>;
  } = {},
): Promise<readonly Contributor[]> {
  const metadata: unknown = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const repository = resolveGitHubRepository(metadata);
  if (repository === null) return [];

  const fetchPage = options.fetchPage ?? fetch;
  const contributors = new Map<number, Contributor>();
  // Pagination is an external I/O boundary; the accumulator is local to this request.
  for (let page = 1; ; page += 1) {
    const records = await fetchContributorsPageAsync(repository, page, fetchPage, options.token);
    for (const record of records) {
      const contributor = parseContributor(record);
      if (contributor !== null) contributors.set(contributor.id, contributor);
    }
    if (records.length < 100) return [...contributors.values()];
  }
}

/*** Resolves only explicitly declared GitHub repositories, never arbitrary API destinations. */
function resolveGitHubRepository(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const repository = metadata.repository;
  const url = isRecord(repository) ? repository.url : repository;
  if (typeof url !== 'string') return null;

  const match = /^(?:git\+)?(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:|github:)([a-z\d-]+)\/([a-z\d_.-]+?)(?:\.git)?\/?$/iu.exec(
    url,
  );
  const owner = match?.[1];
  const name = match?.[2];
  if (!owner || !name || name === '.' || name === '..') return null;
  return `${owner}/${name}`;
}

/*** Fetches one page from the fixed GitHub API origin and rejects incomplete responses. */
async function fetchContributorsPageAsync(
  repository: string,
  page: number,
  fetchPage: (url: string, init: RequestInit) => Promise<Response>,
  token?: string,
): Promise<readonly unknown[]> {
  const response = await fetchPage(
    `https://api.github.com/repos/${repository}/contributors?per_page=100&page=${page}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (response.status === 204) return [];
  if (!response.ok) throw new Error(`GitHub contributors request failed (HTTP ${response.status}).`);
  const records: unknown = await response.json();
  if (!Array.isArray(records)) throw new Error('Invalid GitHub contributors response.');
  return records;
}

/*** Maps human account records to safe, canonical profile and avatar identifiers. */
function parseContributor(record: unknown): Contributor | null {
  if (!isRecord(record)) throw new Error('Invalid GitHub contributor record.');
  if (record.type !== 'User') return null;
  const { login, id } = record;
  if (
    typeof login !== 'string' ||
    !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/iu.test(login) ||
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new Error('Invalid GitHub contributor identity.');
  }
  return { login, id };
}
