import { associateDocBlocksWithSymbols } from './associateDocBlocksWithSymbols.js';
import { collectSourceFiles } from './collectSourceFiles.js';
import { createTypeScriptProgram } from './createTypeScriptProgram.js';
import { collectDocBlocks } from './docBlocks.js';
import {
  collectExports,
  collectPropsForExport,
  collectRelatedTypes,
  collectTypeMembers,
  getExportSignature,
  resolveTypeReference,
} from './exports.js';
import {
  collectCallGraph,
  collectComponentCompositionGraph,
  collectImportGraph,
} from './graphs.js';
import type { AnalyzedProject } from './model.js';
import { defaultTagRegistry } from './tagRegistry.js';

interface AnalyzeProjectConfig {
  root: string;
  entrypoints?: string[];
}

/***
 * Runs the semantic analyzer pipeline for a project.
 */
export function analyzeProject(config: AnalyzeProjectConfig): AnalyzedProject {
  const program = createTypeScriptProgram({
    root: config.root,
    entrypoints: config.entrypoints,
  });
  const files = collectSourceFiles(program);
  const docBlocks = files.flatMap((file) =>
    collectDocBlocks(file.sourceFile, { program, tagRegistry: defaultTagRegistry }),
  );
  const exports = associateDocBlocksWithSymbols(program, docBlocks, collectExports(program)).map(
    (entry) => {
      const signature = getExportSignature(program, entry);
      const props = collectPropsForExport(program, entry);
      const typeReference = resolveTypeReference(program, entry.node);
      const typeMembers =
        typeReference && (entry.kind === 'interface' || entry.kind === 'type')
          ? collectTypeMembers(program, typeReference)
          : undefined;
      const relatedTypes = collectRelatedTypes({
        name: entry.name,
        signature,
        props,
        typeMembers,
      });

      return {
        ...entry,
        signature,
        props,
        typeMembers,
        relatedTypes,
      };
    },
  );

  const tags = new Map<string, string | null>();
  for (const docBlock of docBlocks) {
    for (const tag of docBlock.tags) {
      tags.set(tag.name, tag.value ?? null);
    }
  }

  const graphs = {
    imports: collectImportGraph(program),
    calls: collectCallGraph(program),
    typeReferences: exports.flatMap((entry) =>
      entry.relatedTypes.map((typeName) => ({
        fromSymbol: entry.name,
        toType: typeName,
        sourcePath: entry.sourcePath,
      })),
    ),
    componentComposition: collectComponentCompositionGraph(program, exports),
  };

  return {
    files,
    exports,
    docBlocks,
    tags: [...tags.entries()].map(([name, value]) => ({ name, value })),
    graphs,
  };
}
