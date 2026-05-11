export { analyzeProject } from './analyzeProject.js';
export { associateDocBlocksWithSymbols } from './associateDocBlocksWithSymbols.js';
export { collectSourceFiles } from './collectSourceFiles.js';
export { createTypeScriptProgram } from './createTypeScriptProgram.js';
export { collectDocBlocks, collectTags } from './docBlocks.js';
export {
  collectDefaultValuesFromBinding,
  collectExports,
  collectPropsForExport,
  collectRelatedTypes,
  collectTypeMembers,
  detectExportKind,
  getExportSignature,
  resolveTypeReference,
} from './exports.js';
export {
  collectCallGraph,
  collectComponentCompositionGraph,
  collectImportGraph,
} from './graphs.js';
export { isReactComponent } from './isReactComponent.js';
export type {
  AnalyzedDocBlock,
  AnalyzedExport,
  AnalyzedExportKind,
  AnalyzedFile,
  AnalyzedGraphs,
  AnalyzedProgram,
  AnalyzedProject,
  AnalyzedProp,
  AnalyzedProps,
  AnalyzedTag,
  AnalyzedTypeMember,
  CallEdge,
  ComponentCompositionEdge,
  ImportEdge,
  ResolvedTypeReference,
  TypeReferenceEdge,
} from './model.js';
export { getParadoxComment, parseParadoxComment } from './paradoxComment.js';
