import { spawnSync } from 'node:child_process';

import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';
import type { Capability } from '@ankhorage/contracts/capabilities';
import type { AnkhCommandDescriptor } from '@ankhorage/contracts/cli';

import packageJson from '../package.json' with { type: 'json' };
import { CAPABILITIES } from './capabilities/index.js';

const commandList = [
  {
    path: ['generate'],
    summary: 'Generate package documentation.',
    capability: 'docs.generate' satisfies Capability['id'],
  },
] as const satisfies readonly (AnkhCommandDescriptor & {
  readonly capability: Capability['id'];
})[];

const handlers = commandList.map((command) => ({
  path: command.path,
  handler() {
    const result = spawnSync('paradox', [], { stdio: 'inherit' });
    return { exitCode: result.status ?? 1 };
  },
}));

const provider = {
  id: packageJson.name,
  category: 'docs',
  version: packageJson.version,
  capabilities: CAPABILITIES,
  commands: commandList,
  handlers,
} as const satisfies AnkhRuntimeCommandProvider;

export default provider;
