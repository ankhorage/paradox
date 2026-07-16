import { readFile, writeFile } from 'node:fs/promises';

const path = 'tests/readmeUsage.test.ts';
let source = await readFile(path, 'utf8');

source = source.replace(
  "      const installationStart = output.readme.indexOf('## Installation');\n      const usageSection = output.readme.slice(usageStart, installationStart);",
  "      const generatedDocsStart = output.readme.indexOf('## Generated documentation');\n      const usageSection = output.readme.slice(usageStart, generatedDocsStart);",
);

source = source.replace(
  "      expect(output.readme).toContain('## Installation');\n      expect(output.readme).toContain('bunx @fixture/usage');",
  "      expect(output.readme).not.toContain('## Installation');\n      expect(output.readme).not.toContain('bunx @fixture/usage');",
);

source = source.replace(
  "      expect(output.readme.indexOf('### Minimal app root.')).toBeLessThan(\n        output.readme.indexOf('## Installation'),\n      );",
  "      expect(output.readme.indexOf('### Minimal app root.')).toBeLessThan(\n        output.readme.indexOf('## Generated documentation'),\n      );",
);

await writeFile(path, source);
