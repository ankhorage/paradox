import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type CliFixtureProvider =
  'bin' | 'broken' | 'commands' | 'events' | 'none' | 'programmatic' | 'zora';

export async function createCliAvailabilityFixtureAsync(options: {
  category?: string;
  foreignProvider?: boolean;
  name: string;
  provider: CliFixtureProvider;
}): Promise<{ category: string; name: string; provider: CliFixtureProvider; root: string }> {
  const root = join(import.meta.dir, '..', '.tmp', `cli-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'examples', 'programmatic'), { recursive: true });
  const category = options.category ?? packageBaseName(options.name);
  const metadata = createAnkhMetadata(options.name, category, options.provider);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: options.name,
      version: '1.0.0',
      ...(options.provider === 'bin' ? { bin: { fixture: './src/index.ts' } } : {}),
      ...(metadata === null ? {} : { ankh: metadata }),
    }),
  );
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2022' },
      include: ['src', 'examples'],
    }),
  );
  await writeFile(join(root, 'src', 'index.ts'), "export const fixture = 'fixture';\n");
  await writeFile(
    join(root, 'examples', 'programmatic', 'index.ts'),
    [
      '/***',
      ' * @title Programmatic Usage',
      ' * @usage',
      ' * @readme',
      ' */',
      "export const usage = 'programmatic';",
      '',
    ].join('\n'),
  );
  if (options.provider === 'commands' || options.provider === 'events') {
    await writeFile(
      join(root, 'provider.mjs'),
      createProviderModule(options.name, category, options.provider),
    );
  }
  if (options.foreignProvider === true) await createForeignProviderFixtureAsync(root);
  return { category, name: options.name, provider: options.provider, root };
}

function createAnkhMetadata(
  name: string,
  category: string,
  provider: CliFixtureProvider,
): Record<string, unknown> | null {
  if (provider === 'bin' || provider === 'programmatic') return null;
  if (provider === 'none')
    return {
      category,
      provider: null,
      capabilities: [createEventCapability(name, `${category}.event`)],
    };
  if (provider === 'zora')
    return {
      category: 'zora',
      provider: null,
      capabilities: [createEventCapability(name, 'zora.event')],
    };
  if (provider === 'broken')
    return {
      category,
      provider: './provider.mjs',
      capabilities: [createActionCapability(name, `${category}.run`)],
    };
  const capability =
    provider === 'events'
      ? createEventCapability(name, `${category}.event`)
      : createActionCapability(name, `${category}.run`);
  return { category, provider: './provider.mjs', capabilities: [capability] };
}

async function createForeignProviderFixtureAsync(root: string): Promise<void> {
  const foreignRoot = join(root, 'node_modules', '@ankhorage', 'foreign');
  await mkdir(foreignRoot, { recursive: true });
  const capability = createActionCapability('@ankhorage/foreign', 'foreign.run');
  await writeFile(
    join(foreignRoot, 'package.json'),
    JSON.stringify({
      name: '@ankhorage/foreign',
      version: '1.0.0',
      ankh: { category: 'foreign', provider: './provider.mjs', capabilities: [capability] },
    }),
  );
  await writeFile(
    join(foreignRoot, 'provider.mjs'),
    [
      "import { writeFileSync } from 'node:fs';",
      `writeFileSync(${JSON.stringify(join(root, 'foreign-provider-executed'))}, 'executed');`,
      `export default ${JSON.stringify({
        id: '@ankhorage/foreign',
        category: 'foreign',
        version: '1.0.0',
        capabilities: [capability],
        commands: [{ path: ['run'], summary: 'Run.', capability: 'foreign.run' }],
      })};`,
      '',
    ].join('\n'),
  );
}

function createProviderModule(
  name: string,
  category: string,
  provider: 'commands' | 'events',
): string {
  const capability =
    provider === 'events'
      ? createEventCapability(name, `${category}.event`)
      : createActionCapability(name, `${category}.run`);
  const commands =
    provider === 'events'
      ? []
      : [{ path: ['run'], summary: 'Run the fixture.', capability: `${category}.run` }];
  return `export default ${JSON.stringify({ id: name, category, version: '1.0.0', capabilities: [capability], commands })};\n`;
}

function createActionCapability(owner: string, id: string): Record<string, unknown> {
  return { id, owner, access: ['invoke'], binding: { kind: 'action', bindableAs: ['target'] } };
}

function createEventCapability(owner: string, id: string): Record<string, unknown> {
  return { id, owner, access: ['emit'], binding: { kind: 'event', bindableAs: ['source'] } };
}

function packageBaseName(packageName: string): string {
  return packageName.split('/').at(-1) ?? packageName;
}
