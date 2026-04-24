import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ParadoxConfig } from '../config/types.js';
import type { RenderResult } from '../render/types.js';

/***
 * Writes generated documentation artifacts to the configured output paths.
 */
export async function write(result: RenderResult, config: ParadoxConfig): Promise<void> {
  const root = config.package?.root ?? process.cwd();
  const outputDir = config.output?.dir ?? 'paradox';
  const mode = config.mode ?? 'safe';

  await mkdir(join(root, outputDir), { recursive: true });

  await writeFile(join(root, outputDir, 'exports.md'), result.exportsMarkdown);
  await writeFile(join(root, outputDir, 'components.md'), result.components);
  await writeFile(join(root, outputDir, 'exports.json'), result.exportsJson);
  await writeFile(join(root, outputDir, 'paradox.json'), result.paradoxJson);

  if (mode === 'write') {
    await writeFile(join(root, 'README.md'), result.readme);
  }
}
