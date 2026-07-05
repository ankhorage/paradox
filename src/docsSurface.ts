import { spawnSync } from 'node:child_process';

const packageName = '@ankhorage/paradox';
const packageVersion = '0.1.13';

const commandList = [
  {
    path: ['docs'],
    summary: 'Generate package documentation.',
    capability: 'docs.generate',
  },
  {
    path: ['docs', 'write'],
    summary: 'Generate and write package documentation.',
    capability: 'docs.generate',
  },
  {
    path: ['docs', 'check'],
    summary: 'Check package documentation generation.',
    capability: 'docs.check',
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
  capabilities: ['docs.generate', 'docs.check'],
  commands: commandList,
  handlers,
};
