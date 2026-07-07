import { spawnSync } from 'node:child_process';

const packageName = '@ankhorage/paradox';
const packageVersion = '0.1.14';

const commandList = [
  {
    path: ['generate'],
    summary: 'Generate package documentation.',
    capability: 'docs.generate',
  },
] as const;

const handlers = commandList.map((command) => ({
  path: command.path,
  handler() {
    const result = spawnSync('paradox', [], { stdio: 'inherit' });
    return { exitCode: result.status ?? 1 };
  },
}));

export default {
  id: packageName,
  category: 'docs',
  version: packageVersion,
  capabilities: ['docs.generate'],
  commands: commandList,
  handlers,
};
