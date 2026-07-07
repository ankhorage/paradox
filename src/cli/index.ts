import { runParadox } from '../run.js';

export interface ParadoxProviderRequest {
  readonly argv: readonly string[];
  readonly context: {
    writeStdout(text: string): void;
  };
}

export interface ParadoxProviderResult {
  readonly exitCode: number;
}

export interface ParadoxProviderHandler {
  readonly path: readonly ['generate'];
  handler(request: ParadoxProviderRequest): Promise<ParadoxProviderResult>;
}

export interface ParadoxProviderCommand {
  readonly path: readonly ['generate'];
  readonly capability: 'docs.generate';
  readonly summary: string;
  readonly examples: readonly string[];
}

export interface ParadoxProvider {
  readonly id: '@ankhorage/paradox';
  readonly category: 'docs';
  readonly version: string;
  readonly capabilities: readonly ['docs.generate'];
  readonly commands: readonly [ParadoxProviderCommand];
  readonly handlers: readonly [ParadoxProviderHandler];
}

const provider: ParadoxProvider = {
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
};

export default provider;
