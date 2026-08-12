import { describe, expect, test } from 'bun:test';
import { Project } from 'ts-morph';

import { getPropsFromType } from '../src/analyze/utils/getPropsFromType.js';

describe('getPropsFromType', () => {
  test('normalizes package-local absolute imports in component prop types', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const packageRoot = '/home/runner/work/surface/surface';
    const typePath = `${packageRoot}/src/index`;
    project.createSourceFile(
      `${typePath}.ts`,
      'export interface SurfaceTheme { readonly mode: "light" | "dark"; }',
    );
    const sourceFile = project.createSourceFile(
      `${packageRoot}/src/context.ts`,
      [
        'export interface ContextProps {',
        `  readonly value: { readonly theme: import("${typePath}").SurfaceTheme };`,
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
