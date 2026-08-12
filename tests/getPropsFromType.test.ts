import { describe, expect, test } from 'bun:test';
import { Project } from 'ts-morph';

import { getPropsFromType } from '../src/analyze/utils/getPropsFromType.js';

describe('getPropsFromType', () => {
  test('normalizes package-local import types when a package root is provided', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const packageRoot = '/home/runner/work/surface/surface';
    project.createSourceFile(
      `${packageRoot}/src/index.ts`,
      'export interface SurfaceTheme { readonly mode: "light" | "dark"; }',
    );
    const sourceFile = project.createSourceFile(
      `${packageRoot}/src/context.ts`,
      [
        "import type { SurfaceTheme } from './index';",
        'export interface ContextProps {',
        '  readonly value: { readonly theme: SurfaceTheme };',
        '}',
      ].join('\n'),
    );
    const declaration = sourceFile.getInterfaceOrThrow('ContextProps');

    expect(getPropsFromType(declaration.getType(), packageRoot)).toEqual([
      {
        name: 'value',
        type: '{ readonly theme: import("./src/index").SurfaceTheme; }',
        required: true,
        description: null,
      },
    ]);
  });
});
