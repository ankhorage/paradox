import type { Capability } from '@ankhorage/contracts/capabilities';

/*** Define the executable documentation operation published by this package. */
export const CAPABILITIES = [
  {
    id: 'docs.generate',
    owner: '@ankhorage/paradox',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Generate documentation',
    description: 'Generate deterministic package documentation.',
  },
] as const satisfies readonly Capability[];
