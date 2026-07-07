import { runParadox } from '../run.js';

interface ProviderRequest {
  readonly argv: readonly string[];
  readonly context: {
    writeStdout(text: string): void;
  };
}

const provider = {
  id: '@ankhorage/paradox',
  category: 'docs',
  version: '0.1.14',
  capabilities: ['docs.generate'],
  commands: [
    {
      path: ['generate'],
      capability: 'docs.generate',
      summary: 'Run Paradox for the current package.',
      examples: ['ankh docs generate'],
    },
  ],
  handlers: [
    {
      path: ['generate'],
      async handler(request: ProviderRequest) {
        await runParadox({ cwd: request.argv[0] });
        request.context.writeStdout('Done.\n');
        return { exitCode: 0 };
      },
    },
  ],
};

export default provider;
