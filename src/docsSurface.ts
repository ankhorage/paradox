const packageName = '@ankhorage/paradox';
const packageVersion = '0.1.12';

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

export default {
  id: packageName,
  category: 'docs',
  version: packageVersion,
  capabilities: ['docs.generate', 'docs.check'],
  commands: commandList,
};
