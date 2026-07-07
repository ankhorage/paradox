import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';

import { runParadox } from '../run.js';

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
      async handler(request) {
        await runParadox({ cwd: request.argv[0] });
        request.context.writeStdout('Done.\n');
        return { exitCode: 0 };
      },
    },
  ],
} satisfies AnkhRuntimeCommandProvider;

export default provider;
