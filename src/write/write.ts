import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ParadoxConfig } from '../config/types.js';
import type { RenderResult } from '../render/types.js';

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

  await mkdir(outputRoot, { recursive: true });

  await writeFile(join(outputRoot, 'exports.md'), result.exportsMarkdown);
  await writeFile(join(outputRoot, 'components.md'), result.components);
  await writeFile(join(outputRoot, 'exports.json'), result.exportsJson);
  await writeFile(join(outputRoot, 'paradox.json'), result.paradoxJson);
  await writeFile(join(outputRoot, 'index.html'), result.indexHtml);

  for (const diagram of result.diagrams) {
    const diagramPath = join(outputRoot, diagram.path);
    await mkdir(dirname(diagramPath), { recursive: true });
    await writeFile(diagramPath, diagram.content);
  }

  if (mode === 'write') {
    await writeFile(join(root, 'README.md'), result.readme);
  }
}
