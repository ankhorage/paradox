import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ParadoxConfig } from '../types/config.js';
import type { RenderResult } from '../types/render.js';
import { preserveContributorsSection } from './utils/preserveContributorsSection.js';
import { syncCollaboratorsWorkflowAsync } from './utils/syncCollaboratorsWorkflowAsync.js';
import { syncFundingFileAsync } from './utils/syncFundingFileAsync.js';

/***
 * Writes generated documentation artifacts to the configured output paths.
 */
export async function write(
  result: RenderResult,
  config: ParadoxConfig,
  runtime: { packageRoot: string; outputRoot: string },
): Promise<void> {
  const root = runtime.packageRoot;
  const { outputRoot } = runtime;
  const mode = config.mode ?? 'safe';

  if (mode === 'write') {
    await syncCollaboratorsWorkflowAsync(root, result.collaboratorsWorkflowYaml, {
      mode: 'check',
    });
  }

  await mkdir(outputRoot, { recursive: true });

  await writeFile(join(outputRoot, 'exports.md'), result.exportsMarkdown);
  await writeFile(join(outputRoot, 'components.md'), result.components);
  await writeFile(join(outputRoot, 'exports.json'), result.exportsJson);
  await writeFile(join(outputRoot, 'paradox.json'), result.paradoxJson);
  await writeFile(join(outputRoot, 'index.html'), result.indexHtml);

  for (const badge of result.badges) {
    const badgePath = join(outputRoot, badge.path);
    await mkdir(dirname(badgePath), { recursive: true });
    await writeFile(badgePath, badge.content);
  }

  for (const diagram of result.diagrams) {
    const diagramPath = join(outputRoot, diagram.path);
    await mkdir(dirname(diagramPath), { recursive: true });
    await writeFile(diagramPath, diagram.content);
  }

  if (mode === 'write') {
    const readmePath = join(root, 'README.md');
    const previousReadme = await readExistingReadmeAsync(readmePath);
    await writeFile(readmePath, preserveContributorsSection(result.readme, previousReadme));
    await syncCollaboratorsWorkflowAsync(root, result.collaboratorsWorkflowYaml);
    await syncFundingFileAsync(root, result.fundingYaml);
  }
}

/*** Read an optional prior generated README without concealing other filesystem failures. */
async function readExistingReadmeAsync(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return '';
    throw error;
  }
}
