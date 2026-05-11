import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const sequenceFlowFixtureRoot = join(import.meta.dir, 'fixtures/sequence-flow');

describe('sequence diagrams', () => {
  test('renders nested call flow without import-only participants', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Sequence Flow Fixture',
          description: 'Fixture docs for sequence diagrams.',
        },
        package: {
          root: sequenceFlowFixtureRoot,
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: sequenceFlowFixtureRoot },
    );

    const output = render(buildModel(analysis), { outputDir: 'paradox' });
    const sequence = output.diagrams.find(
      (diagram) => diagram.path === 'diagrams/entrypoint-sequence.mmd',
    )?.content;

    expect(sequence).toBeDefined();
    expect(sequence).toContain('sequenceDiagram');
    expect(sequence).toContain('participant participant_runA as runA');
    expect(sequence).toContain('participant participant_getMe as getMe');
    expect(sequence).toContain('participant participant_meToo as meToo');
    expect(sequence).toContain('participant_runA->>participant_getMe: getMe()');
    expect(sequence).toContain('participant_getMe->>participant_meToo: meToo()');
    expect(sequence).toContain('participant_meToo-->>participant_getMe: return');
    expect(sequence).toContain('participant_getMe-->>participant_runA: return');
    expect(sequence).not.toContain('unused');
    expect(sequence).not.toContain('imports');
  });
});
