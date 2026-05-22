import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const usageTag = `${String.fromCharCode(64)}usage`;
const readmeTag = `${String.fromCharCode(64)}readme`;

describe('readme usage examples', () => {
  test('renders usage examples from real configured source files', async () => {
    const fixtureRoot = await createUsageFixture();

    try {
      const analysis = await analyze(
        {
          docs: {
            title: 'Usage Fixture',
            description: 'Fixture docs for readme usage examples.',
            usage: {
              entrypoints: ['examples/basic-app/App.tsx'],
            },
          },
          package: {
            root: fixtureRoot,
            entrypoints: ['src/index.ts'],
          },
        },
        { packageRoot: fixtureRoot },
      );

      expect(analysis.readmeUsage).toEqual([
        {
          title: 'Minimal app root.',
          description:
            'Minimal app root.\n\nShows the canonical provider and app shell composition.',
          language: 'tsx',
          sourcePath: 'examples/basic-app/App.tsx',
          code: [
            "import { AppBar, AppShell, Screen, ScreenSection, Text, ZoraProvider } from '../../src';",
            '',
            'export default function BasicApp() {',
            '  return (',
            '    <ZoraProvider initialMode="light">',
            '      <AppShell header={<AppBar title="Dashboard" />}>',
            '        <Screen>',
            '          <ScreenSection>',
            '            <Text>Welcome</Text>',
            '          </ScreenSection>',
            '        </Screen>',
            '      </AppShell>',
            '    </ZoraProvider>',
            '  );',
            '}',
          ].join('\n'),
        },
      ]);

      expect(analysis.entrypoints).toEqual(['src/index.ts']);
      expect(analysis.modules.map((module) => module.path)).not.toContain(
        'examples/basic-app/App.tsx',
      );

      const output = render(buildModel(analysis), { outputDir: 'paradox' });

      expect(output.readme).toContain('## Usage');
      expect(output.readme).toContain('### Minimal app root.');
      expect(output.readme).toContain('Shows the canonical provider and app shell composition.');
      expect(output.readme).toContain('Source: `examples/basic-app/App.tsx`');
      expect(output.readme).toContain('export default function BasicApp()');
      expect(output.readme).toContain('<ZoraProvider initialMode="light">');
      expect(output.readme).not.toContain(usageTag);
      expect(output.readme).not.toContain('/***');
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('renders source usage and package command usage side by side', async () => {
    const fixtureRoot = await createUsageFixture();

    try {
      const analysis = await analyze(
        {
          docs: {
            title: 'Usage Fixture',
            description: 'Fixture docs for readme usage examples.',
            usage: {
              entrypoints: ['examples/basic-app/App.tsx'],
            },
          },
          package: {
            root: fixtureRoot,
            entrypoints: ['src/index.ts'],
          },
        },
        { packageRoot: fixtureRoot },
      );

      const output = render(buildModel(analysis), { outputDir: 'paradox' });

      expect(output.readme).toContain('## Usage');
      expect(output.readme).toContain('## Installation');
      expect(output.readme).toContain('bunx @fixture/usage');
      expect(output.readme.indexOf('## Usage')).toBeLessThan(
        output.readme.indexOf('## Installation'),
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });
});

async function createUsageFixture(): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `usage-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'examples/basic-app'), { recursive: true });

  await writeFile(
    join(root, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/usage',
        version: '1.0.0',
        description: 'Fixture package for readme usage examples.',
        license: 'MIT',
        bin: './src/cli.ts',
        scripts: {
          build: 'tsc --noEmit',
          lint: 'eslint .',
          test: 'bun test',
        },
        devDependencies: {
          typescript: '^5.9.3',
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          skipLibCheck: true,
        },
        include: ['src', 'examples'],
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(root, 'src/index.ts'),
    [
      'export interface ZoraProviderProps {',
      '  children?: unknown;',
      "  initialMode?: 'light' | 'dark';",
      '}',
      '',
      '/***',
      ' * Installs the fixture provider.',
      ' *',
      ' * @readme',
      ' */',
      'export function ZoraProvider(_props: ZoraProviderProps) {',
      '  return null;',
      '}',
      '',
      'export function AppShell(_props: { children?: unknown; header?: unknown }) {',
      '  return null;',
      '}',
      '',
      'export function AppBar(_props: { title: string }) {',
      '  return null;',
      '}',
      '',
      'export function Screen(_props: { children?: unknown }) {',
      '  return null;',
      '}',
      '',
      'export function ScreenSection(_props: { children?: unknown }) {',
      '  return null;',
      '}',
      '',
      'export function Text(_props: { children?: unknown }) {',
      '  return null;',
      '}',
    ].join('\n'),
  );

  await writeFile(
    join(root, 'examples/basic-app/App.tsx'),
    [
      "import { AppBar, AppShell, Screen, ScreenSection, Text, ZoraProvider } from '../../src';",
      '',
      '/***',
      ' * Minimal app root.',
      ' *',
      ' * Shows the canonical provider and app shell composition.',
      ' *',
      ` * ${usageTag}`,
      ` * ${readmeTag}`,
      ' */',
      'export default function BasicApp() {',
      '  return (',
      '    <ZoraProvider initialMode="light">',
      '      <AppShell header={<AppBar title="Dashboard" />}>',
      '        <Screen>',
      '          <ScreenSection>',
      '            <Text>Welcome</Text>',
      '          </ScreenSection>',
      '        </Screen>',
      '      </AppShell>',
      '    </ZoraProvider>',
      '  );',
      '}',
    ].join('\n'),
  );

  return root;
}
