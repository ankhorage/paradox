import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type CliFixtureProvider = 'bin' | 'commands' | 'events' | 'none' | 'programmatic' | 'zora';

export async function createCliAvailabilityFixtureAsync(options: {
  name: string;
  provider: CliFixtureProvider;
}): Promise<{ name: string; provider: CliFixtureProvider; root: string }> {
  const root = join(import.meta.dir, '..', '.tmp', `cli-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'examples', 'programmatic'), { recursive: true });
  const metadata = createAnkhMetadata(options.name, options.provider);
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
    const category = packageBaseName(options.name);
    await writeFile(
      join(root, 'provider.mjs'),
      createProviderModule(options.name, category, options.provider),
    );
  }
  return { ...options, root };
}

function createAnkhMetadata(
  name: string,
  provider: CliFixtureProvider,
): Record<string, unknown> | null {
  const category = packageBaseName(name);
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
  const capability =
    provider === 'events'
      ? createEventCapability(name, `${category}.event`)
      : createActionCapability(name, `${category}.run`);
  return { category, provider: './provider.mjs', capabilities: [capability] };
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
