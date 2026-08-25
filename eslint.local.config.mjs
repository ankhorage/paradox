// Temporary, file-scoped exceptions for pre-existing debt exposed by Devtools 1.6.
// New files and all other rules continue to use the canonical strict baseline.
import { createConfig } from '@ankhorage/devtools/eslint';

export default [
  ...createConfig({
    files: ['tests/*.ts', 'paradox.config.ts'],
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: import.meta.dirname,
  }),
  {
    files: [
      'src/analyze/analyze.ts',
      'src/analyze/badges.ts',
      'src/analyze/exports.ts',
      'src/analyze/modules.ts',
      'src/analyze/semantic/analyzeProject.ts',
      'src/analyze/utils/parseParadoxComment.ts',
      'src/model/buildModel.ts',
      'src/render/renderers/html.ts',
      'tests/analyze.test.ts',
      'tests/analyzer.test.ts',
      'tests/cli.e2e.test.ts',
      'tests/readmeConfig.test.ts',
      'tests/readmeUsage.test.ts',
    ],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['src/analyze/analyze.ts', 'src/analyze/badges.ts', 'src/analyze/semantic/exports.ts'],
    rules: { complexity: 'off' },
  },
  {
    files: [
      'src/analyze/semantic/exports.ts',
      'src/analyze/utils/getExportMetadata.ts',
      'src/model/buildModel.ts',
      'src/render/renderers/html.ts',
      'src/render/renderers/markdown.ts',
      'tests/analyze.test.ts',
    ],
    rules: { 'max-lines': 'off' },
  },
  {
    files: [
      'src/analyze/badges.ts',
      'src/analyze/semantic/docBlocks.ts',
      'src/analyze/semantic/exports.ts',
      'src/analyze/semantic/paradoxComment.ts',
      'src/analyze/utils/getExportMetadata.ts',
      'src/analyze/utils/parseParadoxComment.ts',
      'src/render/renderers/diagrams.ts',
      'src/render/renderers/markdown.ts',
    ],
    rules: { 'security/detect-object-injection': 'off' },
  },
];
